import { describe, expect, it } from 'vitest'
import { unwrapFunctionError } from './supabase'

describe('invokeFn error contract', () => {
  it('prefers the error field returned by an edge function', async () => {
    const message = await unwrapFunctionError({ message: 'Bad request', context: { json: async () => ({ error: 'verbatim backend message' }) } })
    expect(message).toBe('verbatim backend message')
  })
})
