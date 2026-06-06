import { describe, it, expect } from 'vitest'
import { DocEditorStore } from './docEditorStore'

describe('DocEditorStore', () => {
  it('sets and reads text, and replaces a substring via applyEdit', () => {
    const s = new DocEditorStore('Untitled.md', 'Hello world')
    expect(s.getState().text).toBe('Hello world')
    s.setText('New text')
    expect(s.getState().text).toBe('New text')
    const ok = s.applyEdit('New', 'Fresh')
    expect(ok).toBe(true)
    expect(s.getState().text).toBe('Fresh text')
    expect(s.applyEdit('missing', 'x')).toBe(false)
  })
})
