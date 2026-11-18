import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export class CliError extends Error {}

export const CONFIG_DIR = join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'commitdev');

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(join(CONFIG_DIR, file), 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export function writeSecret(file: string, data: unknown) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const path = join(CONFIG_DIR, file);
  writeFileSync(path, JSON.stringify(data, null, 2), { mode: 0o600 });
  chmodSync(path, 0o600);
}

export const fileExists = (file: string) => existsSync(join(CONFIG_DIR, file));
export const readStore = <T>(file: string, fallback: T) => readJson(file, fallback);

export interface Env {
  supabaseUrl: string;
  anonKey: string;
}

/** env vars win, then ~/.config/commitdev/config.json */
export function loadEnv(): Env | null {
  const saved = readJson<Partial<Env>>('config.json', {});
  const supabaseUrl = process.env.COMMITDEV_SUPABASE_URL ?? saved.supabaseUrl;
  const anonKey = process.env.COMMITDEV_SUPABASE_ANON_KEY ?? saved.anonKey;
  return supabaseUrl && anonKey ? { supabaseUrl: supabaseUrl.replace(/\/$/, ''), anonKey } : null;
}

export function saveEnv(env: Env) {
  writeSecret('config.json', env);
}
