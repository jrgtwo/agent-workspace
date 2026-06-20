// src/modules/connectors/connectorsViewerTabs.render.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OpenDocsStore } from './openDocsStore'
import { createConnectorsViewerModule } from './connectorsViewerModule'
import type { McpClient } from '../../core/mcp/mcpClient'

const client = { call: async () => ({ ok: true, text: '# Hello' }) } as unknown as McpClient

describe('connectors viewer tabs', () => {
  it('shows a tab per open file and switches active doc on click', async () => {
    const open = new OpenDocsStore(client)
    const mod = createConnectorsViewerModule(open)
    render(mod.render())
    await open.open('/a.md'); await open.open('/b.md')
    await waitFor(() => expect(screen.getByRole('tab', { name: /a\.md/ })).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: /b\.md/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /a\.md/ }))
    expect(open.getState().activePath).toBe('/a.md')
  })
})
