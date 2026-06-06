import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createDocEditorModule } from './docEditorModule'
import { DocEditorStore } from './docEditorStore'

describe('docEditorModule', () => {
  it('exposes read_document and write-gated apply_edit tools', async () => {
    const store = new DocEditorStore('Untitled.md', 'INTRO')
    const mod = createDocEditorModule(store)
    const read = mod.tools.find((t) => t.name === 'read_document')!
    const apply = mod.tools.find((t) => t.name === 'apply_edit')!
    expect(read.permission?.kind).toBe('read')
    expect(apply.permission?.kind).toBe('write')
    await read.handler({})
    expect(await read.handler({})).toBe('INTRO')
    await apply.handler({ find: 'INTRO', replace: 'BETTER INTRO' })
    expect(store.getState().text).toBe('BETTER INTRO')
  })

  it('renders the document text in a textarea', () => {
    const store = new DocEditorStore('Untitled.md', 'hello')
    const mod = createDocEditorModule(store)
    render(mod.render())
    expect(screen.getByRole('textbox')).toHaveValue('hello')
  })
})
