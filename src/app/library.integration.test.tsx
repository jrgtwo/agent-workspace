import { describe, it, expect, vi } from 'vitest'
import { createServices } from './services'
import { MemoryBackend } from '../core/storage/memoryBackend'

const noClient = { chat: vi.fn() }

describe('multi-document library', () => {
  it('creates documents, keeps their content separate, and restores the active one on reload', async () => {
    const backend = new MemoryBackend()

    const s1 = await createServices({ client: noClient, backend })
    // first doc (auto-created) gets some text
    s1.docStore.setText('alpha body')
    await s1.library.create()                 // second doc, active
    s1.docStore.setText('beta body')
    const betaId = s1.library.getState().activeId
    // allow debounced content save to flush
    await vi.waitFor(async () => {
      expect((await backend.get('doc-editor', `doc:${betaId}`)) as { text: string }).toMatchObject({ text: 'beta body' })
    })

    // "reload": construct fresh services against the same backend
    const s2 = await createServices({ client: noClient, backend })
    expect(s2.library.getState().docs).toHaveLength(2)
    expect(s2.library.getState().activeId).toBe(betaId)   // active restored
    expect(s2.docStore.getState().text).toBe('beta body') // active content restored

    // switching to the other doc shows its content
    const alphaId = s2.library.getState().docs.find((d) => d.id !== betaId)!.id
    await s2.library.setActive(alphaId)
    expect(s2.docStore.getState().text).toBe('alpha body')
  })
})
