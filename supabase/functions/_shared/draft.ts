import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { type ParsedTags, type Platform, parseTags } from './tags.ts';

export interface RepoRow {
  id: string;
  owner_id: string;
  full_name: string;
  default_tone: string;
  default_platforms: Platform[];
  webhook_secret: string;
}

export interface DraftRow {
  id: string;
  repo_id: string;
  owner_id: string;
  commit_sha: string;
  commit_message: string;
  commit_diff: string | null;
  tags: ParsedTags;
  platform: Platform;
  content: string | null;
  revision: number;
}

const MAX_DIFF_CHARS = 12_000;

const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/,
  /gh[pousr]_[A-Za-z0-9]{36,}/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(api[_-]?key|secret|token|passw(or)?d)\s*[:=]\s*['"][^'"\s]{8,}['"]/i,
];

/** Drop any diff line that looks like a credential, then truncate. */
export function sanitizeDiff(diff: string): string {
  const cleaned = diff
    .split('\n')
    .map((line) => (SECRET_PATTERNS.some((re) => re.test(line)) ? '[redacted line]' : line))
    .join('\n');
  return cleaned.length > MAX_DIFF_CHARS ? cleaned.slice(0, MAX_DIFF_CHARS) + '\n[diff truncated]' : cleaned;
}

/**
 * Insert one pending draft per platform. Returns ONLY rows that were newly inserted, so the GitHub
 * webhook and the local git hook can both fire for the same commit without double-posting.
 */
export async function ensureDrafts(
  admin: SupabaseClient,
  repo: RepoRow,
  commit: { sha: string; message: string; diff: string },
): Promise<DraftRow[]> {
  const tags = parseTags(commit.message);
  if (!tags.trigger) return [];
  const platforms = tags.platforms.length ? tags.platforms : repo.default_platforms;
  const rows = platforms.map((platform) => ({
    repo_id: repo.id,
    owner_id: repo.owner_id,
    commit_sha: commit.sha,
    commit_message: commit.message,
    commit_diff: sanitizeDiff(commit.diff),
    tags,
    platform,
  }));
  const { data, error } = await admin
    .from('drafts')
    .upsert(rows, { onConflict: 'repo_id,commit_sha,platform', ignoreDuplicates: true })
    .select();
  if (error) throw new Error(`insert drafts: ${error.message}`);
  return (data ?? []) as DraftRow[];
}

const PLATFORM_RULES: Record<Platform, string> = {
  x: 'A single post of at most 280 characters, or a tight thread of at most 4 posts separated by a line containing only "---". No hashtag spam (max 2).',
  linkedin: 'A LinkedIn post of 600-1300 characters. Short paragraphs, a strong first line, max 3 hashtags at the end.',
  devto: 'A Dev.to article in Markdown with a title on the first line prefixed by "# ", 300-600 words, with code snippets only if they come from the diff.',
  hashnode: 'A Hashnode article in Markdown with a title on the first line prefixed by "# ", 300-600 words, with code snippets only if they come from the diff.',
};

const LENGTH_HINT = { short: 'Keep it short.', medium: '', long: 'Go deeper and tell the full story.' } as const;

export async function writeContent(draft: DraftRow, repo: RepoRow, feedback?: string): Promise<string> {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  const t = draft.tags ?? ({} as ParsedTags);
  const system = [
    'You are CommitDev, a developer storytelling engine. You turn a git commit into a post the developer would be proud to publish.',
    'Write in the first person as the developer. Be specific about what changed and why it matters. No fluff, no hype words, no invented metrics or features that are not in the commit.',
    'Never include secrets, tokens, or private URLs. Output only the post text, nothing else.',
  ].join('\n');
  const user = [
    `Repository: ${repo.full_name}`,
    `Platform: ${draft.platform}. ${PLATFORM_RULES[draft.platform]}`,
    `Tone: ${t.tone ?? repo.default_tone}. ${t.length ? LENGTH_HINT[t.length] : ''}`,
    t.focus ? `Focus: ${t.focus}` : '',
    `Commit message:\n${draft.commit_message}`,
    `Diff:\n${draft.commit_diff ?? '(not available)'}`,
    feedback ? `The developer rejected the previous version with this feedback, apply it:\n${feedback}\nPrevious version:\n${draft.content ?? ''}` : '',
  ].filter(Boolean).join('\n\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5-5',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const text = (json.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('').trim();
  if (!text) throw new Error('empty completion');
  return text;
}

/** Generate content for a draft and move it to ready (or failed). Never throws. */
export async function runGeneration(admin: SupabaseClient, draft: DraftRow, repo: RepoRow, feedback?: string) {
  try {
    const content = await writeContent(draft, repo, feedback);
    await admin.from('drafts').update({ content, status: 'ready', error: null }).eq('id', draft.id);
  } catch (e) {
    await admin.from('drafts').update({ status: 'failed', error: String((e as Error).message ?? e).slice(0, 500) }).eq('id', draft.id);
  }
}
