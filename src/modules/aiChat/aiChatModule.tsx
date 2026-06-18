import type { WorkspaceModule } from '../../core/types'
import type { AgentEngine } from '../../core/agentEngine'
import type { PermissionBroker } from '../../core/permissionBroker'
import type { AgentAccentStore } from './agentAccentStore'
import type { ComposerDraftStore } from './composer/composerDraftStore'
import { ChatPanel } from './ChatPanel'

export function createAiChatModule(engine: AgentEngine, broker: PermissionBroker, accent: AgentAccentStore, draft?: ComposerDraftStore): WorkspaceModule {
  return {
    id: 'ai-chat',
    title: 'AI Chat — writing ideas',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 55, collapsible: true, minSize: 20 },
    render: () => <ChatPanel engine={engine} broker={broker} accent={accent} draft={draft} />,
    tools: [],
  }
}
