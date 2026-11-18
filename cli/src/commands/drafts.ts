import type { SupabaseClient } from '@supabase/supabase-js';
import { CliError } from '../env.ts';
import { requireUser } from '../client.ts';
import { badge, dim, intro, mint, p, shortId } from '../ui.ts';

export interface Draft {
  id: string; repo_id: string; commit_sha: string; commit_message: string; platform: string;
  content: string | null; image_path: string | null; status: string; error: string | null;
  revision: number; created_at: string;
}

export async function resolveDraft(client: SupabaseClient, idOrPrefix?: string): Promise<Draft> {
  if (!idOrPrefix) throw new CliError('Missing draft id (the first 8 characters are enough).');
  const { data, error } = await client.from('drafts').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw new CliError(error.message);
  const matches = (data as Draft[]).filter((d) => d.id.startsWith(idOrPrefix));
  if (matches.length === 0) throw new CliError(`No draft starts with "${idOrPrefix}".`);
  if (matches.length > 1) throw new CliError(`"${idOrPrefix}" is ambiguous, use more characters.`);
  return matches[0];
}

export function showDraft(d: Draft) {
  const head = `${shortId(d.id)}  ${d.platform}  ${d.commit_sha.slice(0, 7)}  v${d.revision}  ${d.status}`;
  p.note(d.content ?? dim(d.error ? `(failed: ${d.error})` : '(still generating...)'), head);
}

export async function list(flags: { status?: string; all?: boolean }) {
  intro('drafts');
  const { client } = await requireUser();
  let q = client.from('drafts').select('*').order('created_at', { ascending: false }).limit(30);
  if (flags.status) q = q.eq('status', flags.status);
  else if (!flags.all) q = q.in('status', ['pending', 'ready', 'failed']);
  const { data, error } = await q;
  if (error) throw new CliError(error.message);
  if (!data?.length) return p.outro(dim('Nothing here. Commit with [post] in the message.'));
  for (const d of data as Draft[]) {
    const first = (d.content ?? d.commit_message).split('\n')[0].slice(0, 70);
    p.log.message(`${badge(d.status)} ${mint(shortId(d.id))} ${d.platform.padEnd(8)} ${dim(d.commit_sha.slice(0, 7))}  ${first}`);
  }
  p.outro(dim('commitdev draft <id> · approve <id> · reject <id> · regenerate <id>'));
}

export async function show(id?: string) {
  const { client } = await requireUser();
  showDraft(await resolveDraft(client, id));
}

export async function setStatus(id: string | undefined, status: 'approved' | 'rejected', opts: { hold?: boolean } = {}) {
  const { client } = await requireUser();
  const d = await resolveDraft(client, id);
  if (!['ready', 'approved', 'rejected'].includes(d.status)) throw new CliError(`Draft is ${d.status}; wait until it is ready.`);
  const { error } = await client.from('drafts').update({ status }).eq('id', d.id);
  if (error) throw new CliError(error.message);
  p.log.success(`${shortId(d.id)} ${status}.`);
  if (status === 'approved' && !opts.hold) await publishDraft(client, d.id);
}

/** Calls publish-draft and reports the result; failures are logged, not thrown, so watch keeps running. */
export async function publishDraft(client: SupabaseClient, id: string): Promise<boolean> {
  const s = p.spinner();
  s.start('Publishing');
  const { data, error } = await client.functions.invoke('publish-draft', { body: { draft_id: id } });
  let message = data?.error as string | undefined;
  if (!message && error) {
    // FunctionsHttpError carries the response; surface the server's message when we can
    const res = (error as { context?: Response }).context;
    message = await res?.json().then((j: { error?: string }) => j.error).catch(() => undefined) ?? error.message;
  }
  if (message) { s.stop('Not published'); p.log.error(message); return false; }
  s.stop(`Published ${data.url}`);
  return true;
}

export async function publish(id: string | undefined) {
  const { client } = await requireUser();
  const d = await resolveDraft(client, id);
  if (d.status === 'ready') throw new CliError('Approve it first: `commitdev approve <id>`.');
  if (!(await publishDraft(client, d.id))) process.exitCode = 1;
}

export async function regenerate(id: string | undefined, feedback?: string) {
  const { client } = await requireUser();
  const d = await resolveDraft(client, id);
  const s = p.spinner();
  s.start('Rewriting');
  const { error } = await client.functions.invoke('generate-draft', { body: { draft_id: d.id, feedback } });
  if (error) { s.stop('Failed'); throw new CliError(error.message); }
  s.stop('Rewritten');
  const { data } = await client.from('drafts').select('*').eq('id', d.id).single();
  showDraft(data as Draft);
}
