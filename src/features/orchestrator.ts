import type { FeatureManifest } from '../core/types'
import { createAiChatModule } from '../modules/aiChat/aiChatModule'
import { createSessionsModule } from '../modules/orchestrator/sessionsModule'
import { createPlanModule } from '../modules/orchestrator/planModule'
import type { AgentEngine } from '../core/agentEngine'
import type { PermissionBroker } from '../core/permissionBroker'
import type { AgentAccentStore } from '../modules/aiChat/agentAccentStore'
import type { OrchestratorSessionStore } from '../modules/orchestrator/sessionStore'
import type { OrchestratorPlanStore } from '../modules/orchestrator/planStore'

export function createOrchestratorFeature(deps: {
  engine: AgentEngine
  broker: PermissionBroker
  accent: AgentAccentStore
  sessions: OrchestratorSessionStore
  plan: OrchestratorPlanStore
}): FeatureManifest {
  const sessions = createSessionsModule(deps.sessions)
  const chat = createAiChatModule(deps.engine, deps.broker, deps.accent)
  const plan = createPlanModule(deps.plan)
  return {
    id: 'orchestrator',
    name: 'Orchestrator',
    icon: '🧭',
    modules: [sessions, chat, plan],
    // Sessions | Chat | Plan
    layout: {
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'panel', moduleId: 'orchestrator-sessions', size: 18 },
        { type: 'panel', moduleId: 'ai-chat', size: 46, draggable: true },
        { type: 'panel', moduleId: 'orchestrator-plan', size: 36, draggable: true },
      ],
    },
  }
}
