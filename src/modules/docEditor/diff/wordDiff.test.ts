import { describe, it, expect } from 'vitest'
import { wordDiff } from './wordDiff'

describe('wordDiff', () => {
  it('returns all-same for identical strings', () => {
    expect(wordDiff('the cat sat', 'the cat sat')).toEqual([
      { type: 'same', text: 'the cat sat' },
    ])
  })

  it('marks a single replaced word', () => {
    expect(wordDiff('ship by Q2', 'ship by Q3')).toEqual([
      { type: 'same', text: 'ship by ' },
      { type: 'del', text: 'Q2' },
      { type: 'add', text: 'Q3' },
    ])
  })

  it('marks a pure insertion', () => {
    expect(wordDiff('stability', 'stability and speed')).toEqual([
      { type: 'same', text: 'stability' },
      { type: 'add', text: ' and speed' },
    ])
  })

  it('marks a pure deletion', () => {
    expect(wordDiff('high volume here', 'volume here')).toEqual([
      { type: 'del', text: 'high ' },
      { type: 'same', text: 'volume here' },
    ])
  })
})
