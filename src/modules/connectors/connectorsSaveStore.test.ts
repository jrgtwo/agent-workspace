import { describe, it, expect, vi } from 'vitest'
import type { McpClient } from '../../core/mcp/mcpClient'
import { DocEditorStore } from '../docEditor/docEditorStore'
import { ConnectorsSaveStore } from './connectorsSaveStore'

function fakeClient(result: { ok: boolean; text?: string; error?: string } = { ok: true }) {
  return { call: vi.fn().mockResolvedValue({ ok: result.ok, text: result.text ?? '', error: result.error }) } as unknown as McpClient & { call: ReturnType<typeof vi.fn> }
}

function openFile(scratch: DocEditorStore, path: string, text: string) {
  scratch.hydrate({ name: path.split('/').pop()!, text, sourcePath: path })
}

describe('ConnectorsSaveStore', () => {
  it('starts clean and idle', () => {
    const save = new ConnectorsSaveStore({ client: fakeClient(), scratch: new DocEditorStore('No file open') })
    expect(save.getState()).toEqual({ dirty: false, status: 'idle' })
  })

  it('becomes dirty when the opened file is edited', () => {
    const scratch = new DocEditorStore('No file open')
    const save = new ConnectorsSaveStore({ client: fakeClient(), scratch })
    openFile(scratch, '/notes.md', 'hello')
    expect(save.getState().dirty).toBe(false) // freshly opened == on disk

    scratch.setText('hello world')
    expect(save.getState().dirty).toBe(true)
  })

  it('save() writes the current text to the source path and clears dirty', async () => {
    const scratch = new DocEditorStore('No file open')
    const client = fakeClient({ ok: true })
    const save = new ConnectorsSaveStore({ client, scratch })
    openFile(scratch, '/notes.md', 'hello')
    scratch.setText('hello world')

    await save.save()

    expect(client.call).toHaveBeenCalledWith('write_file', { path: '/notes.md', content: 'hello world' })
    expect(save.getState()).toEqual({ dirty: false, status: 'saved' })
  })

  it('opening a different file resets the baseline (not dirty)', () => {
    const scratch = new DocEditorStore('No file open')
    const save = new ConnectorsSaveStore({ client: fakeClient(), scratch })
    openFile(scratch, '/a.md', 'aaa')
    scratch.setText('aaa edited')
    expect(save.getState().dirty).toBe(true)

    openFile(scratch, '/b.md', 'bbb')
    expect(save.getState().dirty).toBe(false)
  })

  it('reports an error when the write fails and stays dirty', async () => {
    const scratch = new DocEditorStore('No file open')
    const save = new ConnectorsSaveStore({ client: fakeClient({ ok: false, error: 'permission denied' }), scratch })
    openFile(scratch, '/notes.md', 'hello')
    scratch.setText('hello world')

    await save.save()

    expect(save.getState()).toMatchObject({ status: 'error', error: 'permission denied', dirty: true })
  })

  it('save() is a no-op when no file is open', async () => {
    const client = fakeClient()
    const save = new ConnectorsSaveStore({ client, scratch: new DocEditorStore('No file open') })
    await save.save()
    expect(client.call).not.toHaveBeenCalled()
  })

  it('rebaseline() treats the current text as saved (absorbs load normalization)', () => {
    const scratch = new DocEditorStore('No file open')
    const save = new ConnectorsSaveStore({ client: fakeClient(), scratch })
    openFile(scratch, '/notes.md', '- a')
    scratch.setText('* a') // e.g. Milkdown normalized the bullet on load
    expect(save.getState().dirty).toBe(true)

    save.rebaseline()
    expect(save.getState().dirty).toBe(false)
  })
})
