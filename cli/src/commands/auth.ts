import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { CliError, loadEnv, saveEnv, writeSecret, CONFIG_DIR } from '../env.ts';
import { getClient, requireUser } from '../client.ts';
import { dim, intro, mint, ok, p } from '../ui.ts';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

export function openBrowser(url: string) {
  const [cmd, args] =
    process.platform === 'darwin' ? ['open', [url]] :
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch { /* the URL is printed anyway */ }
}

/** Loopback server that receives ?code= from the Supabase GitHub OAuth redirect. */
export function listenForCode(port: number, timeoutMs = 180_000) {
  let close = () => {};
  const promise = new Promise<{ code: string; state: string | null }>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
      if (url.pathname !== '/callback') { res.writeHead(404).end(); return; }
      const code = url.searchParams.get('code');
      const err = url.searchParams.get('error_description') ?? url.searchParams.get('error');
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<body style="font-family:system-ui;background:#022c22;color:#6ee7b7;display:grid;place-items:center;height:100vh"><h2>${code ? 'Signed in to CommitDev. You can close this tab.' : 'Sign-in failed.'}</h2></body>`);
      server.close();
      clearTimeout(timer);
      code ? resolve({ code, state: url.searchParams.get('state') }) : reject(new CliError(err ?? 'No code returned'));
    });
    const timer = setTimeout(() => { server.close(); reject(new CliError('Timed out waiting for the browser sign-in.')); }, timeoutMs);
    server.on('error', (e) => reject(new CliError(`Cannot listen on 127.0.0.1:${port} (${(e as Error).message}). Set COMMITDEV_CALLBACK_PORT.`)));
    server.listen(port, '127.0.0.1');
    close = () => { clearTimeout(timer); server.close(); };
  });
  return { promise, close: () => close() };
}

export async function login(flags: { private?: boolean }) {
  intro('login');
  if (!loadEnv()) {
    p.log.info('First run: paste your Supabase project details (Project Settings, API).');
    const supabaseUrl = ok(await p.text({ message: 'Supabase URL', placeholder: 'https://xxxx.supabase.co', validate: (v) => (/^https?:\/\//.test(v ?? '') ? undefined : 'Must start with http(s)://') }));
    const anonKey = ok(await p.password({ message: 'Anon (public) key', validate: (v) => (v ? undefined : 'Required') }));
    saveEnv({ supabaseUrl: supabaseUrl.trim().replace(/\/$/, ''), anonKey: anonKey.trim() });
  }
  const client = getClient();
  const port = Number(process.env.COMMITDEV_CALLBACK_PORT ?? 8976);
  const redirectTo = `http://127.0.0.1:${port}/callback`;
  const listener = listenForCode(port);
  try {
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo, skipBrowserRedirect: true, scopes: flags.private ? 'repo write:repo_hook' : 'public_repo write:repo_hook' },
    });
    if (error || !data.url) throw new CliError(error?.message ?? 'Could not start GitHub sign-in.');
    p.log.step('Opening GitHub in your browser...');
    p.log.message(dim(data.url));
    openBrowser(data.url);
    const s = p.spinner();
    s.start('Waiting for you to authorize');
    const { code } = await listener.promise;
    const { data: sess, error: exErr } = await client.auth.exchangeCodeForSession(code);
    if (exErr || !sess.session) { s.stop('Failed'); throw new CliError(exErr?.message ?? 'Code exchange failed.'); }
    if (sess.session.provider_token) writeSecret('github.json', { token: sess.session.provider_token });
    s.stop('Signed in');
    p.outro(mint(`Welcome, ${sess.session.user.user_metadata?.user_name ?? sess.session.user.email ?? 'dev'}!`) + dim('  Next: cd into a repo and run `commitdev init`'));
  } finally {
    listener.close();
  }
}

export async function logout() {
  const client = getClient();
  await client.auth.signOut({ scope: 'local' }).catch(() => {});
  rmSync(join(CONFIG_DIR, 'github.json'), { force: true });
  p.log.success('Logged out.');
}

export async function whoami() {
  const { user } = await requireUser();
  const login = user.user_metadata?.user_name ?? '(no github login)';
  p.log.message(`${mint(login)} ${dim(user.id)}`);
}
