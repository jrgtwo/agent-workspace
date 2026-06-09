import type { ReactNode } from 'react'
import type { FeatureManifest } from '../core/types'
import { createAiChatModule } from '../modules/aiChat/aiChatModule'
import { createSessionsModule } from '../modules/orchestrator/sessionsModule'
import { createPlanModule } from '../modules/orchestrator/planModule'
import { createPreviewModule } from '../modules/orchestrator/previewModule'
import type { AgentEngine } from '../core/agentEngine'
import type { PermissionBroker } from '../core/permissionBroker'
import type { ProposalStore } from '../core/proposalStore'
import type { ProposalApplier } from '../core/proposalApplier'
import type { AgentAccentStore } from '../modules/aiChat/agentAccentStore'
import type { OrchestratorSessionStore } from '../modules/orchestrator/sessionStore'
import type { OrchestratorPlanStore } from '../modules/orchestrator/planStore'
import type { PreviewStore } from '../modules/orchestrator/previewStore'

export function createOrchestratorFeature(deps: {
  engine: AgentEngine
  broker: PermissionBroker
  accent: AgentAccentStore
  sessions: OrchestratorSessionStore
  plan: OrchestratorPlanStore
  proposals: ProposalStore
  applier: ProposalApplier
  preview: PreviewStore
  previewRenderers: Record<string, () => ReactNode>
}): FeatureManifest {
  const sessions = createSessionsModule(deps.sessions)
  const chat = createAiChatModule(deps.engine, deps.broker, deps.accent)
  const plan = createPlanModule({ plan: deps.plan, proposals: deps.proposals, applier: deps.applier, preview: deps.preview })
  const preview = createPreviewModule(deps.preview, deps.previewRenderers)
  return {
    id: 'orchestrator',
    name: 'Orchestrator',
    icon: '🧭',
    modules: [sessions, chat, plan, preview],
    // Sessions | Chat | Plan | Preview
    layout: {
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'panel', moduleId: 'orchestrator-sessions', size: 15 },
        { type: 'panel', moduleId: 'ai-chat', size: 35, draggable: true },
        { type: 'panel', moduleId: 'orchestrator-plan', size: 25, draggable: true },
        { type: 'panel', moduleId: 'orchestrator-preview', size: 25, draggable: true },
      ],
    },
  }
}
