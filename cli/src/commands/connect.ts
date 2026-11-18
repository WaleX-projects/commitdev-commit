import { CliError } from '../env.ts';
import { requireUser } from '../client.ts';
import { listenForCode, openBrowser } from './auth.ts';
import { badge, dim, intro, mint, p } from '../ui.ts';

const NETS = ['x', 'linkedin'];

export async function connect(platform?: string) {
  intro('connect');
  if (!platform || !NETS.includes(platform)) throw new CliError(`Usage: commitdev connect <${NETS.join('|')}>`);
  const { client } = await requireUser();
  const port = Number(process.env.COMMITDEV_CALLBACK_PORT ?? 8976);
  const redirect_uri = `http://127.0.0.1:${port}/callback`;

  const listener = listenForCode(port);
  try {
    const start = await client.functions.invoke('connect', { body: { action: 'start', platform, redirect_uri } });
    if (start.error || !start.data?.url) throw new CliError(`Could not start: ${start.error?.message ?? start.data?.error}`);
    p.log.step(`Opening ${platform} in your browser...`);
    p.log.message(dim(start.data.url));
    openBrowser(start.data.url);

    const s = p.spinner();
    s.start('Waiting for you to authorize');
    const { code, state } = await listener.promise;
    if (state !== start.data.state) { s.stop('Failed'); throw new CliError('State mismatch, aborting.'); }
    const done = await client.functions.invoke('connect', { body: { action: 'finish', platform, code, redirect_uri, verifier: start.data.verifier } });
    if (done.error || !done.data?.ok) { s.stop('Failed'); throw new CliError(done.data?.error ?? done.error?.message ?? 'Token exchange failed.'); }
    s.stop(`Connected ${mint(platform)}${done.data.account ? ` as ${done.data.account}` : ''}`);
  } finally {
    listener.close();
  }
}

export async function connections() {
  intro('connections');
  const { client } = await requireUser();
  const { data, error } = await client.from('integrations').select('platform, account_name, expires_at');
  if (error) throw new CliError(error.message);
  if (!data?.length) return p.outro(dim('None yet. Try `commitdev connect x` or `commitdev connect linkedin`.'));
  for (const c of data) p.log.message(`${badge('approved')} ${mint(c.platform.padEnd(9))} ${c.account_name ?? ''} ${dim(c.expires_at ? `token until ${c.expires_at.slice(0, 10)}` : '')}`);
  p.outro(dim('Publishing to devto and hashnode is not supported yet.'));
}
