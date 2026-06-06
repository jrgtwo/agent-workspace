import type { FeatureManifest } from '../core/types'
import { createDocEditorModule } from '../modules/docEditor/docEditorModule'
import { createAiChatModule } from '../modules/aiChat/aiChatModule'
import { createPermissionPromptModule } from '../modules/permissionPrompt/permissionPromptModule'
import { createMemoryViewerModule } from '../modules/memoryViewer/memoryViewerModule'
import type { DocEditorStore } from '../modules/docEditor/docEditorStore'
import type { AgentEngine } from '../core/agentEngine'
import type { PermissionBroker } from '../core/permissionBroker'
import type { MemoryStore } from '../core/memoryStore'

export function createNotesFeature(deps: {
  docStore: DocEditorStore; engine: AgentEngine; broker: PermissionBroker; memory: MemoryStore
}): FeatureManifest {
  const chat = createAiChatModule(deps.engine)
  const search = createPermissionPromptModule(deps.broker)   // permission panel occupies the lower-left slot in the slice
  const memory = createMemoryViewerModule(deps.memory)
  const editor = createDocEditorModule(deps.docStore)
  return {
    id: 'notes', name: 'Notes', icon: '📝',
    modules: [chat, search, memory, editor],
    // Left column: AI Chat over Permissions over Memory; right: Document Editor (matches approved mockup, minus deferred web search).
    layout: {
      type: 'split', direction: 'horizontal', children: [
        { type: 'split', direction: 'vertical', size: 34, children: [
          { type: 'panel', moduleId: 'ai-chat', size: 50 },
          { type: 'panel', moduleId: 'permission-prompt', size: 20 },
          { type: 'panel', moduleId: 'memory-viewer', size: 30 },
        ] },
        { type: 'panel', moduleId: 'doc-editor', size: 66 },
      ],
    },
  }
}
