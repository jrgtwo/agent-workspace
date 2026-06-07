import { describe, it, expect } from 'vitest'
import { splitBlocks, placeChanges } from './blocks'
import type { PendingChange } from '../../../core/proposalStore'

const change = (find: string, replace: string, id = 'c1'): PendingChange => ({
  id, moduleId: 'doc-editor', summary: '', payload: { find, replace, reason: 'r' },
})

describe('splitBlocks', () => {
  it('splits top-level markdown blocks by source', () => {
    const blocks = splitBlocks('# Title\n\nFirst para.\n\nSecond para.')
    expect(blocks.map((b) => b.source)).toEqual(['# Title', 'First para.', 'Second para.'])
  })
})

describe('placeChanges', () => {
  it('places a change in the block containing its find, with before/after and its changes', () => {
    const c = change('First', 'Initial')
    const { items, unplaced } = placeChanges('# Title\n\nFirst para.', [c])
    expect(unplaced).toHaveLength(0)
    expect(items[0]).toEqual({ kind: 'static', source: '# Title' })
    expect(items[1]).toEqual({ kind: 'change', before: 'First para.', after: 'Initial para.', changes: [c] })
  })

  it('reports a change whose find is absent anywhere as unplaced', () => {
    const c = change('missing', 'x')
    const { items, unplaced } = placeChanges('Only this.', [c])
    expect(unplaced).toEqual([c])
    expect(items).toEqual([{ kind: 'static', source: 'Only this.' }])
  })

  it('groups multiple changes in the same block (document order), applying all to `after`', () => {
    const b = change('two', 'TWO', 'b')
    const a = change('one', 'ONE', 'a')
    const { items, unplaced } = placeChanges('one two', [b, a]) // passed out of order
    expect(unplaced).toHaveLength(0)
    expect(items).toHaveLength(1)
    const it0 = items[0]
    expect(it0.kind).toBe('change')
    if (it0.kind === 'change') {
      expect(it0.after).toBe('ONE TWO')
      expect(it0.changes).toEqual([a, b]) // ordered by position of find
    }
  })

  it('places a find that spans multiple blocks as a span item (not unplaced), in document order', () => {
    // find covers the heading block AND part of the list block; a trailing paragraph is untouched
    const text = '# Title\n\n- one\n- two\n\nTail para.'
    const c = change('# Title\n\n- one', '# Heading\n\n- ONE')
    const { items, unplaced } = placeChanges(text, [c])
    expect(unplaced).toHaveLength(0)
    expect(items[0]).toEqual({ kind: 'span', change: c })
    expect(items.filter((i) => i.kind === 'span')).toHaveLength(1)
    // the heading + list blocks are consumed by the span; the trailing paragraph remains static
    expect(items[items.length - 1]).toEqual({ kind: 'static', source: 'Tail para.' })
  })

  it('treats an empty find as unplaced', () => {
    const c = change('', 'x')
    const { unplaced } = placeChanges('Some text.', [c])
    expect(unplaced).toEqual([c])
  })
})
