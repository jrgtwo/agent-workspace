import { describe, it, expect, vi } from 'vitest'
import { createServices } from './services'
import { MemoryBackend } from '../core/storage/memoryBackend'
import type { ChatMessage } from '../core/types'

const noClient = { chat: vi.fn() }

describe('persistence', () => {
  it('restores document, chat, and memory from the backend on startup', async () => {
    const backend = new MemoryBackend()
    await backend.set('doc-editor', 'current', { name: 'Untitled.md', text: 'restored draft' })
    await backend.set('memory', 'entries', { entries: [{ id: 'm1', text: 'prefers brevity', createdAt: 1 }] })
    const chat: ChatMessage[] = [{ role: 'user', content: 'earlier question' }]
    await backend.set('chat', 'messages', chat)

    const services = await createServices({ client: noClient, backend })

    expect(services.docStore.getState().text).toBe('restored draft')
    expect(services.memory.getState().entries[0].text).toBe('prefers brevity')
    const msgs = services.engine.getState().messages
    expect(msgs.some((m) => m.role === 'user' && m.content === 'earlier question')).toBe(true)
    // exactly one system message after seedSystem
    expect(msgs.filter((m) => m.role === 'system')).toHaveLength(1)
  })

  it('persists new state back to the backend', async () => {
    const backend = new MemoryBackend()
    const services = await createServices({ client: noClient, backend })

    services.docStore.setText('a fresh draft')
    services.memory.add('learned something')

    await vi.waitFor(async () => {
      expect(await backend.get('doc-editor', 'current')).toEqual({ name: 'Untitled.md', text: 'a fresh draft' })
      const mem = (await backend.get('memory', 'entries')) as { entries: { text: string }[] }
      expect(mem.entries.map((e) => e.text)).toContain('learned something')
    })
  })
})
