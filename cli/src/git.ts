import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CliError } from './env.ts';

export function git(args: string[], cwd?: string): string {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024 }).trim();
  } catch (e) {
    throw new CliError(`git ${args[0]} failed: ${String((e as { stderr?: string }).stderr ?? e).trim()}`);
  }
}

export const gitRoot = (cwd?: string) => git(['rev-parse', '--show-toplevel'], cwd);

/** "git@github.com:Owner/Repo.git" | "https://github.com/Owner/Repo" -> "owner/repo" */
export function remoteFullName(cwd?: string): string {
  const url = git(['remote', 'get-url', 'origin'], cwd);
  const m = url.match(/github\.com[:/]+([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
  if (!m) throw new CliError(`origin (${url}) is not a GitHub remote.`);
  return `${m[1]}/${m[2]}`.toLowerCase();
}

export const commitMessage = (sha: string) => git(['log', '-1', '--format=%B', sha]);
export const commitDiff = (sha: string) => git(['show', '--no-color', '-M', '--stat', '--patch', '--format=', sha]).slice(0, 60_000);

const MARK_START = '# >>> commitdev >>>';
const MARK_END = '# <<< commitdev <<<';
const HOOK_BLOCK = `${MARK_START}
# Runs in the background and never blocks or fails your push.
if command -v commitdev >/dev/null 2>&1; then
  __commitdev_in=$(cat)
  ( printf '%s\\n' "$__commitdev_in" | commitdev hook pre-push >/dev/null 2>&1 & )
fi
${MARK_END}
`;

export function hookPath(cwd?: string): string {
  return resolve(gitRoot(cwd), git(['rev-parse', '--git-path', 'hooks/pre-push'], cwd));
}

export const hookInstalled = (cwd?: string) => {
  const p = hookPath(cwd);
  return existsSync(p) && readFileSync(p, 'utf8').includes(MARK_START);
};

export function installHook(cwd?: string): 'installed' | 'already' {
  const path = hookPath(cwd);
  mkdirSync(dirname(path), { recursive: true });
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '#!/bin/sh\n';
  if (existing.includes(MARK_START)) return 'already';
  writeFileSync(path, existing.replace(/\n?$/, '\n') + HOOK_BLOCK);
  chmodSync(path, 0o755);
  return 'installed';
}

export function uninstallHook(cwd?: string) {
  const path = hookPath(cwd);
  if (!existsSync(path)) return;
  const re = new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}\\n?`);
  writeFileSync(path, readFileSync(path, 'utf8').replace(re, ''));
}
