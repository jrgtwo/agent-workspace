import type { FeatureManifest } from '../core/types'
import { createKanbanModule } from '../modules/kanban/kanbanModule'
import { createAiChatModule } from '../modules/aiChat/aiChatModule'
import type { KanbanStore } from '../modules/kanban/kanbanStore'
import type { KanbanNavStore } from '../modules/kanban/kanbanNavStore'
import type { AgentEngine } from '../core/agentEngine'
import type { PermissionBroker } from '../core/permissionBroker'
import type { AgentAccentStore } from '../modules/aiChat/agentAccentStore'

export function createBoardFeature(deps: {
  store: KanbanStore
  nav: KanbanNavStore
  engine: AgentEngine
  broker: PermissionBroker
  accent: AgentAccentStore
}): FeatureManifest {
  const board = createKanbanModule(deps.store, deps.nav)
  const chat = createAiChatModule(deps.engine, deps.broker, deps.accent) // the Board feature's own agent
  return {
    id: 'kanban',
    name: 'Kanban',
    icon: '📋',
    modules: [board, chat],
    // Board | AI Chat
    layout: {
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'panel', moduleId: 'kanban-board', size: 68, draggable: true },
        { type: 'panel', moduleId: 'ai-chat', size: 32, draggable: true },
      ],
    },
  }
}
