import { describe, it, expect } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { MilkdownEditor } from './milkdownEditor'
import { DocEditorStore } from './docEditorStore'

describe('MilkdownEditor', () => {
  it('mounts and renders document text in the editor', async () => {
    const store = new DocEditorStore('test.md', '# hello\n\nworld')
    render(<MilkdownEditor store={store} />)

    // Milkdown initialization is async — wait for the aria-label='document' element
    const editorEl = await screen.findByLabelText('document')
    expect(editorEl.textContent).toContain('hello')
    expect(editorEl.textContent).toContain('world')
  })

  it('updates editor content when store.setText is called (store→editor sync)', async () => {
    const store = new DocEditorStore('test.md', '# initial\n\ncontent')
    render(<MilkdownEditor store={store} />)

    // Wait for the editor to mount
    await screen.findByLabelText('document')

    // External store update
    act(() => { store.setText('# changed\n\nupdated') })

    await waitFor(() => {
      const editorEl = screen.getByLabelText('document')
      expect(editorEl.textContent).toContain('changed')
    })
  })
})
