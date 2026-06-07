import { describe, it, expect } from 'vitest'
import { classifyTreatment } from './classifyTreatment'

describe('classifyTreatment', () => {
  it('treats a one/two-word change as inline', () => {
    expect(classifyTreatment('ship by Q2', 'ship by Q3')).toBe('inline')
  })

  it('treats a small inline addition as inline', () => {
    expect(classifyTreatment('the cat', 'the black cat')).toBe('inline')
  })

  it('treats a whole-sentence reword as breakout', () => {
    expect(classifyTreatment(
      'We deploy manually every Friday.',
      'We deploy automatically on every merge to main.',
    )).toBe('breakout')
  })

  it('treats a large addition as breakout', () => {
    expect(classifyTreatment(
      'The team shipped.',
      'The team shipped. We also fixed three long-standing bugs and cut the build time in half.',
    )).toBe('breakout')
  })

  it('treats any multi-line change as breakout', () => {
    expect(classifyTreatment('a\nb', 'a\nc')).toBe('breakout')
  })
})
