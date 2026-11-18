import type { Platform } from './database.types'

export function splitXParts(content: string): string[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const parts: string[] = []
  let current: string[] = []
  for (const line of lines) {
    if (line === '---') {
      parts.push(current.join('\n'))
      current = []
    } else {
      current.push(line)
    }
  }
  parts.push(current.join('\n'))
  return parts
}

export function postLimits(platform: Platform, content: string): number[] {
  if (platform === 'x') return splitXParts(content).map((part) => part.length)
  return [content.length]
}

export function validatePostContent(platform: Platform, content: string): string | null {
  if (!content.trim()) return 'Content cannot be empty.'
  const limits = postLimits(platform, content)
  const limit = platform === 'x' ? 280 : 3000
  const invalid = limits.findIndex((length) => length > limit)
  return invalid >= 0 ? `${platform === 'x' ? `Part ${invalid + 1}` : 'Content'} is over the ${limit}-character limit.` : null
}

export function isValidRepoName(value: string): boolean {
  return /^[^/\s]+\/[^/\s]+$/.test(value)
}

export function normalizeRepoName(value: string): string {
  return value.trim().toLowerCase()
}
