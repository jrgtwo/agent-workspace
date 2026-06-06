import { describe, it, expect } from 'vitest'
import { runInline, runBlock } from './commands'
import type { BlockKind, InlineKind } from './commands'

const ALL_INLINE_KINDS: InlineKind[] = ['strong', 'em', 'code', 'link']
const ALL_BLOCK_KINDS: BlockKind[] = ['heading', 'todo', 'code', 'table', 'quote', 'divider']

describe('commands map coverage', () => {
  it('runInline returns a function for every InlineKind', () => {
    for (const kind of ALL_INLINE_KINDS) {
      const result = runInline(kind)
      expect(typeof result, `runInline('${kind}') should return a function`).toBe('function')
    }
  })

  it('runBlock returns a function for every BlockKind', () => {
    for (const kind of ALL_BLOCK_KINDS) {
      const result = runBlock(kind)
      expect(typeof result, `runBlock('${kind}') should return a function`).toBe('function')
    }
  })

  it('each runInline result is a distinct action thunk (not the same reference)', () => {
    const results = ALL_INLINE_KINDS.map(runInline)
    const unique = new Set(results)
    expect(unique.size).toBe(ALL_INLINE_KINDS.length)
  })

  it('each runBlock result is a distinct action thunk (not the same reference)', () => {
    const results = ALL_BLOCK_KINDS.map(runBlock)
    const unique = new Set(results)
    expect(unique.size).toBe(ALL_BLOCK_KINDS.length)
  })
})
