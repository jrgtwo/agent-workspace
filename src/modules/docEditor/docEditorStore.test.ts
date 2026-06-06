import { describe, it, expect } from 'vitest'
import { DocEditorStore } from './docEditorStore'

describe('DocEditorStore', () => {
  it('sets and reads text, and replaces a substring via applyChange', () => {
    const s = new DocEditorStore('Untitled.md', 'Hello world')
    expect(s.getState().text).toBe('Hello world')
    s.setText('New text')
    expect(s.getState().text).toBe('New text')
    const ok = s.applyChange({ find: 'New', replace: 'Fresh' })
    expect(ok).toBe(true)
    expect(s.getState().text).toBe('Fresh text')
    expect(s.applyChange({ find: 'missing', replace: 'x' })).toBe(false)
  })

  it('inserts a replacement containing $ patterns verbatim (no String.replace substitution)', () => {
    const s = new DocEditorStore('Untitled.md', 'price TBD')
    expect(s.applyChange({ find: 'TBD', replace: 'is $5 (was $&)' })).toBe(true)
    expect(s.getState().text).toBe('price is $5 (was $&)')
  })

  it('hydrate() replaces name+text and notifies subscribers', () => {
    const s = new DocEditorStore('Untitled.md', 'old')
    let notified = 0
    s.subscribe(() => { notified++ })
    s.hydrate({ name: 'Notes.md', text: 'restored' })
    expect(s.getState()).toEqual({ name: 'Notes.md', text: 'restored' })
    expect(notified).toBe(1)
  })
})
