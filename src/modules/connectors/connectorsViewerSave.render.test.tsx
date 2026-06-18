import { describe, it, expect, vi } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import type { McpClient } from '../../core/mcp/mcpClient'
import { DocEditorStore } from '../docEditor/docEditorStore'
import { ConnectorsSaveStore } from './connectorsSaveStore'
import { createConnectorsViewerModule } from './connectorsViewerModule'

function fakeClient() {
  return { call: vi.fn().mockResolvedValue({ ok: true, text: '' }) } as unknown as McpClient
}

describe('connectors viewer Save control', () => {
  it('disables Save when there are no unsaved changes, enables it after an edit, and saves on click', () => {
    const scratch = new DocEditorStore('No file open')
    scratch.hydrate({ name: 'notes.md', text: 'hello', sourcePath: '/notes.md' })
    const save = new ConnectorsSaveStore({ client: fakeClient(), scratch })
    const saveSpy = vi.spyOn(save, 'save').mockResolvedValue()

    render(createConnectorsViewerModule(scratch, save).render())

    const button = screen.getByRole('button', { name: /save/i })
    expect(button).toBeDisabled()

    act(() => { scratch.setText('hello world') })
    expect(button).toBeEnabled()

    fireEvent.click(button)
    expect(saveSpy).toHaveBeenCalled()
  })
})
