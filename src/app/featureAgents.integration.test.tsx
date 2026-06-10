import { describe, it, expect, vi } from 'vitest'
import { createServices } from './services'
import { MemoryBackend } from '../core/storage/memoryBackend'
import type { ChatMessage } from '../core/types'

const noClient = { chat: vi.fn() }

describe('per-feature agents', () => {
  it('scopes tools so each agent sees only its own feature (+ remember)', async () => {
    const services = await createServices({ client: noClient, backend: new MemoryBackend() })

    const notesTools = services.features.find((f) => f.id === 'notes')!.modules.flatMap((m) => m.tools.map((t) => t.name))
    const boardTools = services.features.find((f) => f.id === 'kanban')!.modules.flatMap((m) => m.tools.map((t) => t.name))

    expect(notesTools).toContain('read_document')
    expect(notesTools).toContain('propose_edit')
    expect(notesTools).toContain('create_document')
    expect(notesTools).not.toContain('create_cards')
    expect(notesTools).not.toContain('create_board')

    expect(boardTools).toContain('list_board')
    expect(boardTools).toContain('create_cards')
    expect(boardTools).toContain('create_board')
    expect(boardTools).not.toContain('read_document')
    expect(boardTools).not.toContain('propose_edit')
  })

  it('swaps the Notes chat thread when the active document changes', async () => {
    const services = await createServices({ client: noClient, backend: new MemoryBackend() })
    const docA = services.library.getState().activeId

    // Put a message on doc A's thread.
    services.notesEngine.hydrateMessages([{ role: 'user', content: 'about A' } as ChatMessage])

    // Create a new doc (B) and make it active — its thread should be empty, not A's.
    await services.library.create('B.md')
    const docB = services.library.getState().activeId
    expect(docB).not.toBe(docA)
    await vi.waitFor(() =>
      expect(services.notesEngine.getState().messages.some((m) => m.content === 'about A')).toBe(false),
    )

    // Switch back to A — its thread returns.
    await services.library.setActive(docA)
    await vi.waitFor(() =>
      expect(services.notesEngine.getState().messages.some((m) => m.content === 'about A')).toBe(true),
    )
  })

  it('prunes a deleted document\'s chat thread', async () => {
    const backend = new MemoryBackend()
    const services = await createServices({ client: noClient, backend })
    const docA = services.library.getState().activeId
    services.notesEngine.hydrateMessages([{ role: 'user', content: 'about A' } as ChatMessage])

    await services.library.create('B.md') // switch away from A so its thread flush-saves
    await vi.waitFor(async () => expect(await backend.get('notes-chat', docA)).toBeTruthy())

    await services.library.delete(docA)
    await vi.waitFor(async () => expect(await backend.get('notes-chat', docA)).toBeUndefined())
  })

  it('swaps the Board chat thread when the open board changes', async () => {
    const services = await createServices({ client: noClient, backend: new MemoryBackend() })

    // On the projects-list view, the thread key is '__projects__'. Seed a message there.
    services.boardEngine.hydrateMessages([{ role: 'user', content: 'on projects list' } as ChatMessage])

    // Open a specific board → its thread is separate (empty).
    const projectId = services.kanban.createProject({ name: 'Roadmap' })
    services.kanbanNav.openBoard({ projectId })
    await vi.waitFor(() =>
      expect(services.boardEngine.getState().messages.some((m) => m.content === 'on projects list')).toBe(false),
    )

    // Back to the projects list → the original thread returns.
    services.kanbanNav.openProjects()
    await vi.waitFor(() =>
      expect(services.boardEngine.getState().messages.some((m) => m.content === 'on projects list')).toBe(true),
    )
  })
})
