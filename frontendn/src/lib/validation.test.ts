import { describe, expect, it } from 'vitest'
import { isValidRepoName, splitXParts, validatePostContent } from './validation'

describe('X content splitting and limits', () => {
  it('splits only on a line containing exactly three dashes', () => {
    expect(splitXParts('one\n---\ntwo\n---\nthree')).toEqual(['one', 'two', 'three'])
    expect(splitXParts('one --- two')).toEqual(['one --- two'])
  })
  it('validates every X part independently', () => {
    expect(validatePostContent('x', `${'a'.repeat(280)}\n---\nshort`)).toBeNull()
    expect(validatePostContent('x', `${'a'.repeat(281)}\n---\nshort`)).toContain('Part 1')
  })
  it('uses the LinkedIn 3000-character limit', () => {
    expect(validatePostContent('linkedin', 'a'.repeat(3000))).toBeNull()
    expect(validatePostContent('linkedin', 'a'.repeat(3001))).toContain('3000')
  })
})

describe('repository validation', () => {
  it('accepts one owner/name slash and rejects whitespace or extra slashes', () => {
    expect(isValidRepoName('owner/name')).toBe(true)
    expect(isValidRepoName('OWNER/repo')).toBe(true)
    expect(isValidRepoName('owner/')).toBe(false)
    expect(isValidRepoName('owner/name/other')).toBe(false)
    expect(isValidRepoName('owner name/repo')).toBe(false)
  })
})
