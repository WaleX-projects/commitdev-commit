// POST { repo_full_name, sha, message, diff }  -> create drafts for a commit and generate them
// POST { draft_id, feedback? }                  -> regenerate one draft
import { createClient } from 'npm:@supabase/supabase-js@2';
import { type DraftRow, type RepoRow, ensureDrafts, runGeneration } from '../_shared/draft.ts';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const body = await req.json().catch(() => ({}));

  // Regenerate: RLS on userClient guarantees the draft belongs to the caller.
  if (body.draft_id) {
    const { data: draft } = await userClient.from('drafts').select('*').eq('id', body.draft_id).maybeSingle();
    if (!draft) return json({ error: 'draft not found' }, 404);
    const { data: repo } = await userClient.from('repos').select('*').eq('id', draft.repo_id).single();
    const { data: next } = await admin
      .from('drafts')
      .update({ status: 'pending', revision: draft.revision + 1 })
      .eq('id', draft.id)
      .select()
      .single();
    await runGeneration(admin, { ...next, content: draft.content } as DraftRow, repo as RepoRow, body.feedback);
    return json({ ok: true, draft_id: draft.id });
  }

  const { repo_full_name, sha, message, diff } = body as Record<string, string>;
  if (!repo_full_name || !sha || !message) return json({ error: 'repo_full_name, sha and message are required' }, 400);

  const { data: repo } = await userClient.from('repos').select('*').eq('full_name', repo_full_name.toLowerCase()).maybeSingle();
  if (!repo) return json({ error: `repo ${repo_full_name} is not registered, run \`commitdev init\`` }, 404);

  const created = await ensureDrafts(admin, repo as RepoRow, { sha, message, diff: diff ?? '' });
  await Promise.all(created.map((d) => runGeneration(admin, d, repo as RepoRow)));
  return json({ ok: true, created: created.map((d) => ({ id: d.id, platform: d.platform })) });
});
