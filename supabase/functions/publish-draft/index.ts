// POST { draft_id } -> publish an approved (or failed) draft to its platform
import { createClient } from 'npm:@supabase/supabase-js@2';
import { ensureFresh, isNet, postToLinkedIn, postToX, type Tokens } from '../_shared/platforms.ts';

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'content-type': 'application/json' } });
const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { draft_id } = await req.json().catch(() => ({}));
  const { data: draft } = await userClient.from('drafts').select('*').eq('id', draft_id).maybeSingle(); // RLS: own drafts only
  if (!draft) return json({ error: 'draft not found' }, 404);
  if (!isNet(draft.platform)) return json({ error: `publishing to ${draft.platform} is not supported yet` }, 400);
  if (!draft.content?.trim()) return json({ error: 'draft has no content' }, 400);

  // Claim the draft atomically ('pending' = in progress) so double-clicks or two terminals cannot double-post.
  const { data: claimed } = await admin.from('drafts').update({ status: 'pending', error: null })
    .eq('id', draft.id).in('status', ['approved', 'failed']).select('id');
  if (!claimed?.length) return json({ error: `draft is ${draft.status}; only approved or failed drafts can be published` }, 409);

  try {
    const { data: integ } = await admin.from('integrations').select('*').eq('owner_id', user.id).eq('platform', draft.platform).maybeSingle();
    if (!integ) throw new Error(`${draft.platform} is not connected. Run \`commitdev connect ${draft.platform}\`.`);
    const { tokens, changed } = await ensureFresh(draft.platform, integ as Tokens);
    if (changed) await admin.from('integrations').update({ access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_at: tokens.expires_at }).eq('id', integ.id);

    let postUrl: string;
    if (draft.platform === 'x') {
      postUrl = await postToX(tokens, draft.content);
    } else {
      let image: { bytes: Uint8Array; type: string } | undefined;
      if (draft.image_path) {
        const { data: blob } = await admin.storage.from('post-images').download(draft.image_path);
        if (blob) image = { bytes: new Uint8Array(await blob.arrayBuffer()), type: MIME[draft.image_path.split('.').pop()!.toLowerCase()] ?? 'image/jpeg' };
      }
      postUrl = await postToLinkedIn(tokens, draft.content, image);
    }
    await admin.from('drafts').update({ status: 'published', external_url: postUrl, published_at: new Date().toISOString() }).eq('id', draft.id);
    return json({ ok: true, url: postUrl });
  } catch (e) {
    const message = String((e as Error).message ?? e).slice(0, 500);
    await admin.from('drafts').update({ status: 'failed', error: message }).eq('id', draft.id);
    return json({ error: message }, 502);
  }
});
