import { describe, it, expect, vi } from 'vitest'
import { createOrchestratorFeature } from './orchestrator'
import { AgentEngine } from '../core/agentEngine'
import { Registry } from '../core/registry'
import { PermissionBroker } from '../core/permissionBroker'
import { AgentAccentStore } from '../modules/aiChat/agentAccentStore'
import { OrchestratorSessionStore } from '../modules/orchestrator/sessionStore'
import { OrchestratorPlanStore } from '../modules/orchestrator/planStore'
import { createStorage } from '../core/storage/storage'
import { MemoryBackend } from '../core/storage/memoryBackend'
import type { LayoutNode } from '../core/types'

function panelIds(node: LayoutNode): string[] {
  return node.type === 'panel' ? [node.moduleId] : node.children.flatMap(panelIds)
}

describe('orchestrator feature', () => {
  it('declares sessions | chat | plan modules and a layout', async () => {
    const storage = createStorage(new MemoryBackend())
    const broker = new PermissionBroker(() => 'p')
    const engine = new AgentEngine({ chat: vi.fn() }, new Registry(), broker, 'orchestrator')
    const sessions = new OrchestratorSessionStore(storage.scope('s'), () => 's1'); await sessions.init()
    const plan = new OrchestratorPlanStore(storage.scope('p'), () => 'st1'); await plan.init('s1')
    const feature = createOrchestratorFeature({ engine, broker, accent: new AgentAccentStore(), sessions, plan })

    expect(feature.id).toBe('orchestrator')
    expect(feature.name).toBe('Orchestrator')
    expect(feature.modules.map((m) => m.id).sort()).toEqual(['ai-chat', 'orchestrator-plan', 'orchestrator-sessions'])
    expect(panelIds(feature.layout).sort()).toEqual(['ai-chat', 'orchestrator-plan', 'orchestrator-sessions'])
  })
})
