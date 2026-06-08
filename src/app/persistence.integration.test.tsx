import { describe, it, expect, vi } from 'vitest'
import { createServices } from './services'
import { MemoryBackend } from '../core/storage/memoryBackend'
import type { ChatMessage } from '../core/types'

const noClient = { chat: vi.fn() }

describe('persistence', () => {
  it('restores document and memory from the backend on startup', async () => {
    const backend = new MemoryBackend()
    await backend.set('doc-editor', 'current', { name: 'Untitled.md', text: 'restored draft' })
    await backend.set('memory', 'entries', { entries: [{ id: 'm1', text: 'prefers brevity', createdAt: 1 }] })

    const services = await createServices({ client: noClient, backend })

    expect(services.docStore.getState().text).toBe('restored draft')
    expect(services.memory.getState().entries[0].text).toBe('prefers brevity')
    expect(services.notesEngine.getState().messages.filter((m) => m.role === 'system')).toHaveLength(1)
    expect(services.boardEngine.getState().messages.filter((m) => m.role === 'system')).toHaveLength(1)
  })

  it('persists and restores the active document\'s chat thread per document', async () => {
    const backend = new MemoryBackend()
    const a = await createServices({ client: noClient, backend })
    const activeId = a.library.getState().activeId
    a.notesEngine.hydrateMessages([{ role: 'user', content: 'note-scoped question' }])
    await new Promise((r) => setTimeout(r, 450))
    expect((await backend.get('notes-chat', activeId)) as ChatMessage[]).toEqual([
      { role: 'user', content: 'note-scoped question' },
    ])

    const b = await createServices({ client: noClient, backend })
    expect(b.notesEngine.getState().messages.some((m) => m.content === 'note-scoped question')).toBe(true)
  })

  it('persists new state back to the backend', async () => {
    const backend = new MemoryBackend()
    const services = await createServices({ client: noClient, backend })

    services.docStore.setText('a fresh draft')
    services.memory.add('learned something')

    await vi.waitFor(async () => {
      const activeId = services.library.getState().activeId
      expect((await backend.get('doc-editor', `doc:${activeId}`)) as { text: string }).toMatchObject({ text: 'a fresh draft' })
      const mem = (await backend.get('memory', 'entries')) as { entries: { text: string }[] }
      expect(mem.entries.map((e) => e.text)).toContain('learned something')
    })
  })

  it('persists the selected theme across reloads', async () => {
    const backend = new MemoryBackend()
    const a = await createServices({ client: noClient, backend })
    a.theme.setTheme('midnight')
    await new Promise((r) => setTimeout(r, 450)) // let debounced save flush

    const b = await createServices({ client: noClient, backend })
    expect(b.theme.getState()).toEqual({ theme: 'midnight' })
  })
})
