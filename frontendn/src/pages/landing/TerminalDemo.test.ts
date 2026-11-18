import { describe, expect, it } from 'vitest'
import { getTerminalFrame } from './TerminalDemo'

describe('terminal demo', () => {
  it('renders the final published state when reduced motion is preferred', () => {
    const frame = getTerminalFrame(true)
    expect(frame.command).toBe('git push')
    expect(frame.output).toEqual(['drafting for linkedin...', 'draft ready · a1b2c3d4', 'approved · published'])
    expect(frame.postVisible).toBe(true)
  })
})
