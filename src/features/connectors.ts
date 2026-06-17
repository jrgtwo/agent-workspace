import type { FeatureManifest } from '../core/types'
import { createConnectorsModule } from '../modules/connectors/connectorsModule'
import { createAiChatModule } from '../modules/aiChat/aiChatModule'
import type { McpStore } from '../core/mcp/mcpStore'
import type { AgentEngine } from '../core/agentEngine'
import type { PermissionBroker } from '../core/permissionBroker'
import type { AgentAccentStore } from '../modules/aiChat/agentAccentStore'

export function createConnectorsFeature(deps: {
  mcp: McpStore
  onRefresh: () => void
  engine: AgentEngine
  broker: PermissionBroker
  accent: AgentAccentStore
}): FeatureManifest {
  const panel = createConnectorsModule(deps.mcp, deps.onRefresh)
  const chat = createAiChatModule(deps.engine, deps.broker, deps.accent) // the Connectors feature's own agent
  return {
    id: 'connectors',
    name: 'Connectors',
    icon: '🔌',
    modules: [panel, chat],
    // Connector tools panel | AI Chat
    layout: {
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'panel', moduleId: 'connectors-panel', size: 40, draggable: true },
        { type: 'panel', moduleId: 'ai-chat', size: 60, draggable: true },
      ],
    },
  }
}
