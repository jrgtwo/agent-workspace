import { describe, it, expect } from 'vitest'
import { createServices } from './services'
import { createStorage } from '../core/storage/storage'
import { MemoryBackend } from '../core/storage/memoryBackend'
import { collectModuleIds } from '../core/layoutTree'

const stubClient = { chat: async () => ({ content: '', toolCalls: [] }) }

describe('orchestrator preview panel presence', () => {
  it('includes the preview panel in a fresh orchestrator layout', async () => {
    const services = await createServices({ backend: new MemoryBackend(), client: stubClient })
    const layout = services.layoutStores.get('orchestrator')!.getState().layout
    expect(collectModuleIds(layout)).toEqual([
      'orchestrator-sessions', 'ai-chat', 'orchestrator-plan', 'orchestrator-preview',
    ])
  })

  it('reconciles a STALE 3-panel persisted layout to include the new preview panel', async () => {
    const backend = new MemoryBackend()
    // Simulate the layout persisted by an older app version (before the preview panel existed).
    await createStorage(backend).scope('layout').set('orchestrator', {
      layout: {
        type: 'split', direction: 'horizontal', children: [
          { type: 'panel', moduleId: 'orchestrator-sessions', size: 18 },
          { type: 'panel', moduleId: 'ai-chat', size: 46, draggable: true },
          { type: 'panel', moduleId: 'orchestrator-plan', size: 36, draggable: true },
        ],
      },
    })
    const services = await createServices({ backend, client: stubClient })
    const layout = services.layoutStores.get('orchestrator')!.getState().layout
    expect(collectModuleIds(layout)).toContain('orchestrator-preview')
  })
})
