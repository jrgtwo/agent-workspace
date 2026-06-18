import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DocEditorStore } from '../docEditor/docEditorStore'
import { createConnectorsViewerModule } from './connectorsViewerModule'

describe('connectors viewer module', () => {
  it('renders the scratch store contents in the viewer', async () => {
    const scratch = new DocEditorStore('README.md', '# Project\n\nsome contents')
    render(createConnectorsViewerModule(scratch).render())

    const editorEl = await screen.findByLabelText('document')
    expect(editorEl.textContent).toContain('Project')
    expect(editorEl.textContent).toContain('some contents')
  })
})
