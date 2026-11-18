import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { CliError, loadEnv, readStore, writeSecret } from './env.ts';

// Session persistence for supabase-js: a 0600 JSON file.
const AUTH_FILE = 'auth.json';
const fileStorage = {
  getItem: (k: string) => readStore<Record<string, string>>(AUTH_FILE, {})[k] ?? null,
  setItem: (k: string, v: string) => writeSecret(AUTH_FILE, { ...readStore<Record<string, string>>(AUTH_FILE, {}), [k]: v }),
  removeItem: (k: string) => {
    const all = readStore<Record<string, string>>(AUTH_FILE, {});
    delete all[k];
    writeSecret(AUTH_FILE, all);
  },
};

let cached: SupabaseClient | undefined;

export function getClient(): SupabaseClient {
  if (cached) return cached;
  const env = loadEnv();
  if (!env) throw new CliError('Supabase is not configured. Run `commitdev login` or set COMMITDEV_SUPABASE_URL and COMMITDEV_SUPABASE_ANON_KEY.');
  cached = createClient(env.supabaseUrl, env.anonKey, {
    auth: { flowType: 'pkce', storage: fileStorage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}

export async function requireUser(): Promise<{ client: SupabaseClient; user: User; accessToken: string }> {
  const client = getClient();
  const { data } = await client.auth.getSession(); // refreshes an expired token
  if (!data.session) throw new CliError('Not logged in. Run `commitdev login`.');
  return { client, user: data.session.user, accessToken: data.session.access_token };
}
