// Pure module: no Deno or Node APIs, imported by both the edge functions and the CLI.

export const PLATFORMS = ['linkedin', 'x', 'devto', 'hashnode'] as const;
export type Platform = (typeof PLATFORMS)[number];

export type Length = 'short' | 'medium' | 'long';

export interface ParsedTags {
  /** true when the commit message carries [commitdev], [post] or [draft] */
  trigger: boolean;
  action: 'post' | 'draft' | null;
  platforms: Platform[];
  tone?: string;
  length?: Length;
  focus?: string;
  raw: string[];
}

const ALIASES: Record<string, Platform> = {
  linkedin: 'linkedin',
  x: 'x',
  twitter: 'x',
  devto: 'devto',
  'dev.to': 'devto',
  hashnode: 'hashnode',
};

/** e.g. "feat: add login [post][linkedin][tone=technical][length=short]" */
export function parseTags(message: string): ParsedTags {
  const out: ParsedTags = { trigger: false, action: null, platforms: [], raw: [] };
  for (const m of message.matchAll(/\[([a-z0-9_.=\- ]{1,40})\]/gi)) {
    const token = m[1].trim().toLowerCase();
    out.raw.push(token);
    const [key, value] = token.split('=', 2).map((s) => s.trim());
    if (key === 'commitdev' || key === 'post') {
      out.trigger = true;
      out.action = 'post';
    } else if (key === 'draft') {
      out.trigger = true;
      out.action ??= 'draft';
    } else if (value === undefined && ALIASES[key]) {
      if (!out.platforms.includes(ALIASES[key])) out.platforms.push(ALIASES[key]);
    } else if (key === 'tone' && value) {
      out.tone = value;
    } else if (key === 'length' && ['short', 'medium', 'long'].includes(value)) {
      out.length = value as Length;
    } else if (key === 'focus' && value) {
      out.focus = value;
    }
  }
  return out;
}
