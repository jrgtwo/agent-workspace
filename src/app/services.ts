import { LayoutStore } from '../core/layoutStore'
import { PermissionBroker } from '../core/permissionBroker'
import { MemoryStore } from '../core/memoryStore'
import { ProposalStore } from '../core/proposalStore'
import { LlamaClient } from '../core/llamaClient'
import { Registry } from '../core/registry'
import { AgentEngine } from '../core/agentEngine'
import { ThemeStore, applyTheme } from '../core/themeStore'
import { createFeatureChatController } from '../core/featureChatController'
import { AgentAccentStore } from '../modules/aiChat/agentAccentStore'
import { DocEditorStore } from '../modules/docEditor/docEditorStore'
import { createMemoryViewerModule } from '../modules/memoryViewer/memoryViewerModule'
import { createNotesFeature } from '../features/notes'
import { createStyleGuideFeature } from '../features/styleguide'
import { createSettingsFeature } from '../features/settings'
import { createBoardFeature } from '../features/board'
import { KanbanStore } from '../modules/kanban/kanbanStore'
import { KanbanNavStore } from '../modules/kanban/kanbanNavStore'
import { DocumentLibraryStore } from '../modules/docEditor/documentLibraryStore'
import { createStorage } from '../core/storage/storage'
import { persistState } from '../core/storage/persistState'
import type { StorageBackend } from '../core/storage/types'
import type { FeatureManifest } from '../core/types'

let seq = 0
const genId = () => `id-${++seq}`

const NOTES_PROMPT =
  'You are a local, privacy-first writing assistant embedded in a notes app. ' +
  "You help with the user's documents: read and edit the active document, create new documents, " +
  'and remember durable facts — but every read/write/create requires explicit user permission via ' +
  'tools. Prefer reading the document before editing. When you learn a durable preference about the ' +
  'user, call the remember tool.'

const BOARD_PROMPT =
  'You are a local, privacy-first assistant embedded in a kanban board app. ' +
  'You help the user manage the currently-open board: list it, create and move cards, and create new ' +
  'boards — every action requires explicit user permission via tools. Use list_board to see column ' +
  'names before creating or moving cards. When you learn a durable preference about the user, call ' +
  'the remember tool.'

export interface AppServices {
  features: FeatureManifest[]
  layoutStores: Map<string, LayoutStore>
  broker: PermissionBroker
  memory: MemoryStore
  notesEngine: AgentEngine
  boardEngine: AgentEngine
  docStore: DocEditorStore
  library: DocumentLibraryStore
  proposals: ProposalStore
  theme: ThemeStore
  agentAccent: AgentAccentStore
  kanban: KanbanStore
  kanbanNav: KanbanNavStore
}

export interface CreateServicesOpts {
  client?: Pick<LlamaClient, 'chat'>
  backend?: StorageBackend
}

// Async: awaits hydration of document/chat/memory before returning, so the UI can render
// the restored workspace without an empty flash or a type-during-load race.
export async function createServices(opts?: CreateServicesOpts): Promise<AppServices> {
  const storage = createStorage(opts?.backend)
  const broker = new PermissionBroker(genId)
  const memory = new MemoryStore(genId)
  const proposals = new ProposalStore(genId)
  const theme = new ThemeStore()
  const agentAccent = new AgentAccentStore()
  const docStore = new DocEditorStore('Untitled.md', '')

  const env = import.meta.env as unknown as Record<string, string | undefined>
  const baseUrl = env.VITE_LLAMA_URL ?? 'http://localhost:8080/v1'
  const model = env.VITE_LLAMA_MODEL ?? 'local'
  const client = opts?.client ?? new LlamaClient(baseUrl, model)

  // One registry + one engine PER FEATURE: each agent sees only its own feature's tools.
  const notesRegistry = new Registry()
  const boardRegistry = new Registry()
  const notesEngine = new AgentEngine(client, notesRegistry, broker, 'notes-chat')
  const boardEngine = new AgentEngine(client, boardRegistry, broker, 'board-chat')

  // The document library owns the 'doc-editor' scope (index/active/doc:<id>) and hydrates
  // the active document into docStore. Memory/theme/accent persist via the declarative helper.
  const library = new DocumentLibraryStore(docStore, storage.scope('doc-editor'), genId)
  await library.init()
  await persistState(memory, storage.scope('memory'), 'entries')
  await persistState(theme, storage.scope('theme'), 'state')
  await persistState(agentAccent, storage.scope('ai-chat'), 'agent-accent')
  applyTheme(theme.getState().theme) // set initial attribute before first paint

  // Kanban: native board feature. Collision-resistant ids because they are persisted.
  const kanbanId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : genId()
  const kanban = new KanbanStore(kanbanId)
  const kanbanNav = new KanbanNavStore()
  await persistState(kanban, storage.scope('kanban'), 'state')

  // Image blobs are stored locally in 'doc-images' scope (privacy: never uploaded).
  const imageScope = storage.scope('doc-images')
  const saveImage = async (file: File): Promise<string> => {
    const id = genId()
    await imageScope.set(id, file)
    return id
  }

  const notes = createNotesFeature({ docStore, library, engine: notesEngine, broker, memory, proposals, accent: agentAccent, saveImage })
  const styleguide = createStyleGuideFeature()
  const settings = createSettingsFeature({ theme, memory })
  const board = createBoardFeature({ store: kanban, nav: kanbanNav, engine: boardEngine, broker, accent: agentAccent })

  // Register each feature's tools into ITS OWN registry, plus the global `remember` tool into both
  // (memory is workspace-wide; Settings has no agent so we register `remember` explicitly).
  const memoryModule = createMemoryViewerModule(memory)
  for (const mod of notes.modules) notesRegistry.register(mod.tools)
  for (const mod of board.modules) boardRegistry.register(mod.tools)
  notesRegistry.register(memoryModule.tools)
  boardRegistry.register(memoryModule.tools)

  // Per-context chat threads. Notes = one thread per document (keyed by doc id), pruned when a
  // document is deleted. Board = one thread per project (keyed by project id), '__projects__' on
  // the boards-list view. Each controller hydrates the active thread + seeds the feature prompt.
  await createFeatureChatController({
    engine: notesEngine,
    scope: storage.scope('notes-chat'),
    systemPrompt: NOTES_PROMPT,
    getKey: () => library.getState().activeId,
    source: library,
    listValidKeys: () => library.getState().docs.map((d) => d.id),
  })
  await createFeatureChatController({
    engine: boardEngine,
    scope: storage.scope('board-chat'),
    systemPrompt: BOARD_PROMPT,
    getKey: () => kanbanNav.activeScope()?.projectId ?? '__projects__',
    source: kanbanNav,
  })

  const layoutStores = new Map<string, LayoutStore>()
  for (const feature of [notes, styleguide, settings, board]) {
    const ls = new LayoutStore(feature.layout)
    await persistState(ls, storage.scope('layout'), feature.id)
    layoutStores.set(feature.id, ls)
  }

  return { features: [notes, styleguide, settings, board], layoutStores, broker, memory, notesEngine, boardEngine, docStore, library, proposals, theme, agentAccent, kanban, kanbanNav }
}
