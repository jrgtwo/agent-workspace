import type { FeatureManifest } from '../core/types'
import { createConnectorsModule } from '../modules/connectors/connectorsModule'
import { createConnectorsViewerModule } from '../modules/connectors/connectorsViewerModule'
import { createConnectorsTreeModule } from '../modules/connectors/connectorsTreeModule'
import { createAiChatModule } from '../modules/aiChat/aiChatModule'
import type { McpStore } from '../core/mcp/mcpStore'
import type { AgentEngine } from '../core/agentEngine'
import type { PermissionBroker } from '../core/permissionBroker'
import type { AgentAccentStore } from '../modules/aiChat/agentAccentStore'
import type { ComposerDraftStore } from '../modules/aiChat/composer/composerDraftStore'
import type { OpenDocsStore } from '../modules/connectors/openDocsStore'
import type { ConnectorsTreeStore } from '../modules/connectors/connectorsTreeStore'

export function createConnectorsFeature(deps: {
  mcp: McpStore
  onRefresh: () => void
  engine: AgentEngine
  broker: PermissionBroker
  accent: AgentAccentStore
  draft: ComposerDraftStore
  open: OpenDocsStore
  tree: ConnectorsTreeStore
  onOpenFile: (path: string) => void
  onTreeRefresh: () => void
}): FeatureManifest {
  const filetree = createConnectorsTreeModule(deps.tree, deps.onOpenFile, deps.onTreeRefresh)
  const panel = createConnectorsModule(deps.mcp, deps.onRefresh, deps.draft)
  const chat = createAiChatModule(deps.engine, deps.broker, deps.accent, deps.draft) // the Connectors feature's own agent
  const viewer = createConnectorsViewerModule(deps.open) // shows + saves files the agent opens
  return {
    id: 'connectors',
    name: 'Connectors',
    icon: '🔌',
    modules: [filetree, panel, chat, viewer],
    // File tree | Connector tools panel | AI Chat | file viewer
    layout: {
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'panel', moduleId: 'connectors-tree', size: 18, collapsible: true, draggable: true },
        { type: 'panel', moduleId: 'connectors-panel', size: 16, collapsible: true, draggable: true },
        { type: 'panel', moduleId: 'ai-chat', size: 33, draggable: true },
        { type: 'panel', moduleId: 'connectors-viewer', size: 33, draggable: true },
      ],
    },
  }
}
