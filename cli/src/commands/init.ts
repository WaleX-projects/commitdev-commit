import { CliError, loadEnv, readStore } from '../env.ts';
import { requireUser } from '../client.ts';
import { gitRoot, hookInstalled, installHook, remoteFullName } from '../git.ts';
import { createWebhook } from '../github.ts';
import { PLATFORMS, type Platform } from '../../../supabase/functions/_shared/tags.ts';
import { dim, intro, mint, ok, p } from '../ui.ts';

export async function init() {
  intro('init');
  const { client, user } = await requireUser();
  const root = gitRoot();
  const fullName = remoteFullName();
  p.log.info(`Repo ${mint(fullName)} ${dim(root)}`);

  const platforms = ok(await p.multiselect<Platform>({
    message: 'Where should CommitDev draft posts by default?',
    options: PLATFORMS.map((value) => ({ value, label: value })),
    initialValues: ['linkedin', 'x'],
    required: true,
  }));
  const tone = ok(await p.select({
    message: 'Default tone',
    options: ['technical', 'casual', 'storytelling', 'concise'].map((value) => ({ value, label: value })),
  }));


    


const { data: existing } = await client.from('repos').select('id').eq('full_name', fullName).maybeSingle();
const { data: repo, error } = existing
  ? await client.from('repos').update({ default_tone: tone, default_platforms: platforms }).eq('id', existing.id).select().single()
  : await client.from('repos').insert({ owner_id: user.id, full_name: fullName, default_tone: tone, default_platforms: platforms }).select().single();


  if (error || !repo) throw new CliError(`Could not save repo: ${error?.message}`);

  if (!hookInstalled() && ok(await p.confirm({ message: 'Install a git pre-push hook so `git push` triggers drafts locally?' }))) {
    p.log.success(installHook() === 'installed' ? 'Hook installed (.git/hooks/pre-push).' : 'Hook already installed.');
  }

  const env = loadEnv()!;
  const hookUrl = `${env.supabaseUrl}/functions/v1/github-webhook`;
  if (ok(await p.confirm({ message: 'Also register the GitHub webhook (works from any machine and CI)?' }))) {
    const token = readStore<{ token?: string }>('github.json', {}).token;
    const result = token ? await createWebhook(token, fullName, hookUrl, repo.webhook_secret) : { error: 'no GitHub token saved (run `commitdev login`)' };
    if (result === 'created') p.log.success('Webhook created.');
    else if (result === 'exists') p.log.info('A webhook already exists for this repo.');
    else p.note(`Payload URL   ${hookUrl}\nContent type  application/json\nSecret        ${repo.webhook_secret}\nEvents        push`, `Could not create it automatically (${result.error}). Add it manually:`);
  }

  p.outro(mint('Ready.') + dim(' Commit with [post] in the message, or run `commitdev watch`.'));
}
