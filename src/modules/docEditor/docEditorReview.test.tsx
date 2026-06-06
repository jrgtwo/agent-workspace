import { describe, it, expect } from 'vitest'
import { computeReviewSegments } from './docEditorReview'
import type { PendingChange } from '../../core/proposalStore'

const change = (find: string, replace: string, id = 'c1'): PendingChange => ({
  id, moduleId: 'doc-editor', summary: '', payload: { find, replace },
})

describe('computeReviewSegments', () => {
  it('splits text around a single located change', () => {
    const { segments, unplaced } = computeReviewSegments('Hello world', [change('world', 'there')])
    expect(unplaced).toHaveLength(0)
    expect(segments).toEqual([
      { kind: 'text', text: 'Hello ' },
      { kind: 'change', change: change('world', 'there') },
    ])
  })

  it('orders multiple changes by position and keeps trailing text', () => {
    const c1 = change('Hello', 'Hi', 'a')
    const c2 = change('world', 'there', 'b')
    const { segments } = computeReviewSegments('Hello world!', [c2, c1])
    expect(segments.map((s) => s.kind)).toEqual(['change', 'text', 'change', 'text'])
    expect(segments[1]).toEqual({ kind: 'text', text: ' ' })
    expect(segments[3]).toEqual({ kind: 'text', text: '!' })
  })

  it('reports changes whose find text is absent as unplaced', () => {
    const c = change('missing', 'x')
    const { segments, unplaced } = computeReviewSegments('Hello', [c])
    expect(unplaced).toEqual([c])
    expect(segments).toEqual([{ kind: 'text', text: 'Hello' }])
  })

  it('treats a change that overlaps an earlier one as unplaced', () => {
    const x = change('foo', 'A', 'x')
    const y = change('foob', 'B', 'y')
    const { segments, unplaced } = computeReviewSegments('foobar', [x, y])
    expect(segments).toEqual([
      { kind: 'change', change: x },
      { kind: 'text', text: 'bar' },
    ])
    expect(unplaced).toEqual([y])
  })
})
