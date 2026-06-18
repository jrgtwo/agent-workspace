import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import type { McpClient } from '../../core/mcp/mcpClient'
import { DocEditorStore } from '../docEditor/docEditorStore'
import { ConnectorsSaveStore } from './connectorsSaveStore'
import { createConnectorsViewerModule } from './connectorsViewerModule'

const fakeClient = () => ({ call: vi.fn().mockResolvedValue({ ok: true, text: '' }) } as unknown as McpClient)

function openViewer(opened: boolean) {
  const scratch = new DocEditorStore('No file open')
  if (opened) scratch.hydrate({ name: 'notes.md', text: 'hello', sourcePath: '/notes.md' })
  const save = new ConnectorsSaveStore({ client: fakeClient(), scratch })
  render(createConnectorsViewerModule(scratch, save).render())
  return { scratch }
}

describe('connectors viewer Close control', () => {
  afterEach(() => vi.restoreAllMocks())

  it('hides Close when no file is open', () => {
    openViewer(false)
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull()
  })

  it('clears the viewer when closing a clean file (no confirm)', () => {
    const confirm = vi.spyOn(window, 'confirm')
    const { scratch } = openViewer(true)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(confirm).not.toHaveBeenCalled()
    expect(scratch.getState().sourcePath).toBeUndefined()
    expect(scratch.getState().name).toBe('No file open')
  })

  it('confirms before discarding unsaved changes; cancel keeps the file', () => {
    const { scratch } = openViewer(true)
    act(() => { scratch.setText('hello edited') })
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(scratch.getState().sourcePath).toBe('/notes.md') // unchanged
  })

  it('discards unsaved changes when the confirm is accepted', () => {
    const { scratch } = openViewer(true)
    act(() => { scratch.setText('hello edited') })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(scratch.getState().sourcePath).toBeUndefined()
  })
})
