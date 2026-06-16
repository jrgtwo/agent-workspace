import type { FeatureManifest } from '../core/types'
import { createGraphLensModule } from '../modules/graph/graphLensModule'
import { createAiChatModule } from '../modules/aiChat/aiChatModule'
import type { EntityStore } from '../modules/graph/entityStore'
import type { AgentEngine } from '../core/agentEngine'
import type { PermissionBroker } from '../core/permissionBroker'
import type { AgentAccentStore } from '../modules/aiChat/agentAccentStore'

export function createGraphFeature(deps: {
  store: EntityStore
  engine: AgentEngine
  broker: PermissionBroker
  accent: AgentAccentStore
}): FeatureManifest {
  const lens = createGraphLensModule(deps.store)
  const chat = createAiChatModule(deps.engine, deps.broker, deps.accent) // the Graph feature's own agent
  return {
    id: 'graph',
    name: 'Graph',
    icon: '🕸️',
    modules: [lens, chat],
    // Lens (List/Board) | AI Chat
    layout: {
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'panel', moduleId: 'graph-lens', size: 68, draggable: true },
        { type: 'panel', moduleId: 'ai-chat', size: 32, draggable: true },
      ],
    },
  }
}
