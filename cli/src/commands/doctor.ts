import { loadEnv } from '../env.ts';
import { getClient } from '../client.ts';
import { gitRoot, hookInstalled, remoteFullName } from '../git.ts';
import { dim, intro, p } from '../ui.ts';

export async function doctor() {
  intro('doctor');
  const check = async (name: string, fn: () => Promise<string | void> | string | void) => {
    try { p.log.success(`${name} ${dim(String((await fn()) ?? ''))}`); }
    catch (e) { p.log.error(`${name} ${dim((e as Error).message)}`); }
  };
  await check('config', () => { const e = loadEnv(); if (!e) throw new Error('run `commitdev login`'); return e.supabaseUrl; });
  await check('session', async () => {
    const { data } = await getClient().auth.getSession();
    if (!data.session) throw new Error('not logged in');
    return data.session.user.user_metadata?.user_name;
  });
  await check('git repo', () => gitRoot());
  await check('github remote', () => remoteFullName());
  await check('pre-push hook', () => { if (!hookInstalled()) throw new Error('not installed (commitdev init)'); });
  await check('repo registered', async () => {
    const { data, error } = await getClient().from('repos').select('id').eq('full_name', remoteFullName()).maybeSingle();
    if (error || !data) throw new Error(error?.message ?? 'run `commitdev init`');
  });
  p.outro(dim('Done.'));
}
