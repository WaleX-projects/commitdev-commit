// GitHub push webhook. Auth = per-repo HMAC secret (repos.webhook_secret), so verify_jwt is off.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { type RepoRow, ensureDrafts, runGeneration } from '../_shared/draft.ts';
import { parseTags } from '../_shared/tags.ts';

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const enc = new TextEncoder();

async function validSignature(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header?.startsWith('sha256=')) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(raw)));
  const expected = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
  const given = header.slice('sha256='.length);
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

async function fetchDiff(fullName: string, sha: string): Promise<string> {
  const headers: Record<string, string> = { accept: 'application/vnd.github.diff', 'user-agent': 'commitdev' };
  const token = Deno.env.get('GITHUB_TOKEN');
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${fullName}/commits/${sha}`, { headers });
    return res.ok ? await res.text() : '';
  } catch {
    return '';
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const raw = await req.text();
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }

  const fullName = String(payload.repository?.full_name ?? '').toLowerCase();
  if (!fullName) return new Response('no repository', { status: 400 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: repos } = await admin.from('repos').select('*').eq('full_name', fullName);
  const sig = req.headers.get('x-hub-signature-256');
  const verified: RepoRow[] = [];
  for (const r of (repos ?? []) as RepoRow[]) if (await validSignature(raw, sig, r.webhook_secret)) verified.push(r);
  if (!verified.length) return new Response('invalid signature', { status: 401 });

  const event = req.headers.get('x-github-event');
  if (event === 'ping') return new Response('pong');
  if (event !== 'push' || payload.deleted) return new Response('ignored', { status: 202 });

  const work = async () => {
    for (const c of (payload.commits ?? []).slice(0, 20) as { id: string; message: string }[]) {
      if (!parseTags(c.message).trigger) continue;
      const diff = await fetchDiff(fullName, c.id);
      for (const repo of verified) {
        const created = await ensureDrafts(admin, repo, { sha: c.id, message: c.message, diff });
        await Promise.all(created.map((d) => runGeneration(admin, d, repo)));
      }
    }
  };
  EdgeRuntime.waitUntil(work().catch((e) => console.error('webhook work failed', e)));
  return new Response('accepted', { status: 202 });
});
