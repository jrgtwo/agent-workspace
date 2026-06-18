import type { FeatureManifest } from '../core/types'
import { createConnectorsModule } from '../modules/connectors/connectorsModule'
import { createConnectorsViewerModule } from '../modules/connectors/connectorsViewerModule'
import { createAiChatModule } from '../modules/aiChat/aiChatModule'
import type { McpStore } from '../core/mcp/mcpStore'
import type { AgentEngine } from '../core/agentEngine'
import type { PermissionBroker } from '../core/permissionBroker'
import type { AgentAccentStore } from '../modules/aiChat/agentAccentStore'
import type { ComposerDraftStore } from '../modules/aiChat/composer/composerDraftStore'
import type { DocEditorStore } from '../modules/docEditor/docEditorStore'
import type { ConnectorsSaveStore } from '../modules/connectors/connectorsSaveStore'

export function createConnectorsFeature(deps: {
  mcp: McpStore
  onRefresh: () => void
  engine: AgentEngine
  broker: PermissionBroker
  accent: AgentAccentStore
  draft: ComposerDraftStore
  scratch: DocEditorStore
  save: ConnectorsSaveStore
}): FeatureManifest {
  const panel = createConnectorsModule(deps.mcp, deps.onRefresh, deps.draft)
  const chat = createAiChatModule(deps.engine, deps.broker, deps.accent, deps.draft) // the Connectors feature's own agent
  const viewer = createConnectorsViewerModule(deps.scratch, deps.save) // shows + saves files the agent opens
  return {
    id: 'connectors',
    name: 'Connectors',
    icon: '🔌',
    modules: [panel, chat, viewer],
    // Connector tools panel | AI Chat | file viewer
    layout: {
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'panel', moduleId: 'connectors-panel', size: 26, draggable: true },
        { type: 'panel', moduleId: 'ai-chat', size: 40, draggable: true },
        { type: 'panel', moduleId: 'connectors-viewer', size: 34, draggable: true },
      ],
    },
  }
}
