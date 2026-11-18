import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { requireUser } from '../client.ts';
import { CONFIG_DIR, CliError } from '../env.ts';
import { commitDiff, commitMessage, git, remoteFullName } from '../git.ts';
import { parseTags } from '../../../supabase/functions/_shared/tags.ts';
import { intro, mint, dim, p } from '../ui.ts';

const ZERO = /^0+$/;

/** Send one commit to the generate-draft function. Returns null if it carries no trigger tag. */
export async function triggerCommit(sha: string): Promise<{ id: string; platform: string }[] | null> {
  const message = commitMessage(sha);
  if (!parseTags(message).trigger) return null;
  const { client } = await requireUser();
  const { data, error } = await client.functions.invoke('generate-draft', {
    body: { repo_full_name: remoteFullName(), sha: git(['rev-parse', sha]), message, diff: commitDiff(sha) },
  });
  if (error) throw new CliError(`generate-draft failed: ${error.message}`);
  return data.created;
}

/** `commitdev trigger [sha]` — manual run, handy for testing without pushing. */
export async function trigger(sha = 'HEAD') {
  intro('trigger');
  const s = p.spinner();
  s.start('Asking the agent');
  const created = await triggerCommit(sha);
  if (created === null) { s.stop('No [post], [draft] or [commitdev] tag in that commit message.'); return; }
  s.stop(created.length ? `Drafting for ${created.map((c) => c.platform).join(', ')}` : 'Drafts for this commit already exist.');
  p.outro(dim('Review them with `commitdev watch` or `commitdev drafts`.'));
  void mint;
}

/** Called by the git pre-push hook with ref lines on stdin. Silent, never throws. */
export async function hookPrePush() {
  try {
    const refs = readFileSync(0, 'utf8').split('\n').map((l) => l.trim().split(/\s+/)).filter((p) => p.length >= 4);
    const shas = new Set<string>();
    for (const [, localSha, , remoteSha] of refs) {
      if (ZERO.test(localSha)) continue; // branch deletion
      const range = ZERO.test(remoteSha) ? [localSha, '--not', '--remotes'] : [`${remoteSha}..${localSha}`];
      for (const s of git(['rev-list', '--max-count=20', ...range]).split('\n').filter(Boolean)) shas.add(s);
    }
    for (const sha of shas) await triggerCommit(sha);
  } catch (e) {
    try { appendFileSync(join(CONFIG_DIR, 'hook.log'), `${new Date().toISOString()} ${String((e as Error).message ?? e)}\n`); } catch { /* ignore */ }
  }
}
