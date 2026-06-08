import type { FeatureManifest } from '../core/types'
import { createDocEditorModule } from '../modules/docEditor/docEditorModule'
import { createDocumentExplorerModule } from '../modules/docEditor/documentExplorerModule'
import { createAiChatModule } from '../modules/aiChat/aiChatModule'
import type { AgentAccentStore } from '../modules/aiChat/agentAccentStore'
// Permission-prompt and memory-viewer modules are currently commented out of the
// Notes layout (see below); imports disabled to keep the build clean until re-added.
// import { createPermissionPromptModule } from '../modules/permissionPrompt/permissionPromptModule'
// import { createMemoryViewerModule } from '../modules/memoryViewer/memoryViewerModule'
import type { DocEditorStore } from '../modules/docEditor/docEditorStore'
import type { DocumentLibraryStore } from '../modules/docEditor/documentLibraryStore'
import type { AgentEngine } from '../core/agentEngine'
import type { PermissionBroker } from '../core/permissionBroker'
import type { MemoryStore } from '../core/memoryStore'
import type { ProposalStore } from '../core/proposalStore'

export function createNotesFeature(deps: {
  docStore: DocEditorStore
  library: DocumentLibraryStore
  engine: AgentEngine
  broker: PermissionBroker
  memory: MemoryStore
  proposals: ProposalStore
  accent: AgentAccentStore
  saveImage?: (file: File) => Promise<string>
}): FeatureManifest {
  const explorer = createDocumentExplorerModule(deps.library)
  const chat = createAiChatModule(deps.engine, deps.broker, deps.accent)
  // const perms = createPermissionPromptModule(deps.broker)
  // const memory = createMemoryViewerModule(deps.memory)
  const editor = createDocEditorModule(deps.docStore, deps.proposals, { saveImage: deps.saveImage, library: deps.library })
  return {
    id: 'notes', name: 'Notes', icon: '📝',
    modules: [explorer, chat, /*perms, memory,*/ editor],
    // Explorer | (AI Chat / Permissions / Memory) | Document Editor
    layout: {
      type: 'split', direction: 'horizontal', children: [
        { type: 'panel', moduleId: 'document-explorer', size: 16 },
        { type: 'split', direction: 'vertical', size: 28, children: [
          { type: 'panel', moduleId: 'ai-chat', size: 50, draggable: true },
          // { type: 'panel', moduleId: 'permission-prompt', size: 20 },
          // { type: 'panel', moduleId: 'memory-viewer', size: 30 },
        ] },
        { type: 'panel', moduleId: 'doc-editor', size: 56, draggable: true },
      ],
    },
  }
}
