import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { McpClient } from '../../core/mcp/mcpClient'
import { OpenDocsStore } from './openDocsStore'
import { createConnectorsViewerModule } from './connectorsViewerModule'

const fakeClient = { call: async (_n: string, a: { path: string }) => ({ ok: true, text: '# ' + a.path }) } as unknown as McpClient

describe('connectors viewer module', () => {
  it('renders open file contents in the viewer', async () => {
    const open = new OpenDocsStore(fakeClient)
    await open.open('/docs/README.md')
    render(createConnectorsViewerModule(open).render())

    const editorEl = await screen.findByLabelText('document')
    expect(editorEl.textContent).toContain('/docs/README.md')
  })
})
