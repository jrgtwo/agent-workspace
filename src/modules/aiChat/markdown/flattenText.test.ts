import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { flattenText } from './flattenText'

describe('flattenText', () => {
  it('flattens nested React children to a plain string', () => {
    const tree = createElement('span', null, 'const ',
      createElement('span', { className: 'k' }, 'x'), ' = 1')
    expect(flattenText(tree)).toBe('const x = 1')
  })
  it('handles strings, numbers, arrays, null', () => {
    expect(flattenText(['a', 1, null, 'b'])).toBe('a1b')
  })
})
