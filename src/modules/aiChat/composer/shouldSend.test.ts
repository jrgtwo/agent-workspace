import { describe, it, expect } from 'vitest'
import { shouldSend } from './shouldSend'

describe('shouldSend', () => {
  it('sends when there is non-whitespace text and not busy', () => {
    expect(shouldSend('hello', false)).toBe(true)
  })
  it('does not send when empty or whitespace-only', () => {
    expect(shouldSend('', false)).toBe(false)
    expect(shouldSend('   \n', false)).toBe(false)
  })
  it('does not send while busy', () => {
    expect(shouldSend('hello', true)).toBe(false)
  })
})
