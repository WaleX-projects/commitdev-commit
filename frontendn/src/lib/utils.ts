import type { Json } from './database.types'

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export function relativeTime(value: string): string {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 45) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

export function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

export function firstLine(value: string): string {
  return value.split(/\r?\n/)[0] || 'Untitled post'
}

export function tagEntries(tags: Json): Array<[string, string]> {
  if (!tags || typeof tags !== 'object' || Array.isArray(tags)) return []
  return Object.entries(tags).filter((entry): entry is [string, string] => typeof entry[1] === 'string' || typeof entry[1] === 'number' || typeof entry[1] === 'boolean').map(([key, value]) => [key, String(value)])
}

export function safeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'image'
}
