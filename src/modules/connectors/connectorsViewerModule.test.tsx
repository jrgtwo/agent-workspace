import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { McpClient } from '../../core/mcp/mcpClient'
import { DocEditorStore } from '../docEditor/docEditorStore'
import { ConnectorsSaveStore } from './connectorsSaveStore'
import { createConnectorsViewerModule } from './connectorsViewerModule'

const fakeClient = () => ({ call: vi.fn().mockResolvedValue({ ok: true, text: '' }) } as unknown as McpClient)

describe('connectors viewer module', () => {
  it('renders the scratch store contents in the viewer', async () => {
    const scratch = new DocEditorStore('README.md', '# Project\n\nsome contents')
    const save = new ConnectorsSaveStore({ client: fakeClient(), scratch })
    render(createConnectorsViewerModule(scratch, save).render())

    const editorEl = await screen.findByLabelText('document')
    expect(editorEl.textContent).toContain('Project')
    expect(editorEl.textContent).toContain('some contents')
  })
})
