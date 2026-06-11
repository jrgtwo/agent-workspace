import { LayoutStore } from '../core/layoutStore'
import { PermissionBroker } from '../core/permissionBroker'
import { MemoryStore } from '../core/memoryStore'
import { ProposalStore } from '../core/proposalStore'
import { ProposalApplier } from '../core/proposalApplier'
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
import { createOrchestratorFeature } from '../features/orchestrator'
import { ResearchRegistry } from '../core/research/researchRegistry'
import { SearxngProvider } from '../core/research/searxngProvider'
import { SearchResultsStore } from '../modules/search/searchResultsStore'
import { createSearchFeature } from '../features/search'
import { OrchestratorSessionStore } from '../modules/orchestrator/sessionStore'
import { OrchestratorPlanStore } from '../modules/orchestrator/planStore'
import { PreviewStore } from '../modules/orchestrator/previewStore'
import { createOrchestratorTools, type FeatureAgentRegistry } from '../modules/orchestrator/orchestratorTools'
import { describeOrchestratorContext } from '../modules/orchestrator/context'
import { KanbanStore } from '../modules/kanban/kanbanStore'
import { KanbanNavStore } from '../modules/kanban/kanbanNavStore'
import { describeKanbanContext } from '../modules/kanban/context'
import { DocumentLibraryStore } from '../modules/docEditor/documentLibraryStore'
import { describeNotesContext } from '../modules/docEditor/context'
import { createStorage } from '../core/storage/storage'
import { persistState } from '../core/storage/persistState'
import type { StorageBackend } from '../core/storage/types'
import type { FeatureManifest } from '../core/types'

let seq = 0
// Ephemeral, within-session ids (permission requests, proposals): a readable counter is fine.
const genId = () => `id-${++seq}`
// PERSISTED entities (documents, sessions, kanban, memory, images) need ids unique ACROSS reloads.
// The seq counter resets to 0 every load, so reusing it would mint ids that collide with entities
// saved in a previous session (duplicate docs/sessions, multiple index entries → one doc:<id>).
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${++seq}`)

const NOTES_PROMPT =
  'You are a local, privacy-first writing assistant embedded in a notes app. ' +
  "You help with the user's documents: read and edit the active document, create new documents, " +
  'and remember durable facts. Your tools are: read_document, propose_edit, append_document, ' +
  'create_document, remember — you have no others. Reading the document asks the user for permission ' +
  'first. Your edits do NOT apply immediately: propose_edit, append_document, and create_document are ' +
  'PROPOSED as pending changes the user reviews and accepts or rejects in the UI (there is no separate ' +
  'permission popup for them, and nothing changes until the user accepts) — so just call the tool and ' +
  'let the user decide. Prefer reading the document before editing. To add new content to a document ' +
  '(or write into an empty one), use append_document; use propose_edit only to change existing text. ' +
  'If the user rejects a proposal or denies a read, stop and explain — do not retry the same action. ' +
  'When you learn a durable preference about the user, call the remember tool.'

const BOARD_PROMPT =
  'You are a local, privacy-first assistant embedded in a kanban board app. ' +
  'You help the user manage the currently-open board: list it, create and move cards, and create new ' +
  'boards. Your tools are: list_board, create_cards, move_card, create_board, open_board, remember — ' +
  'you have no others. Listing the board asks the user for permission first. Your changes do NOT apply ' +
  'immediately: create_cards, move_card, and create_board are PROPOSED as pending changes the user ' +
  'reviews and accepts or rejects in the UI (no separate permission popup, and nothing changes until ' +
  'the user accepts) — so just call the tool and let the user decide. Use list_board to see column ' +
  'names before adding or moving cards. To add cards, gather ALL of them and call create_cards ONCE ' +
  '(it takes a list; each card names its own column) — never call it once per card. To add cards ' +
  'inside a sub-board, call open_board with ' +
  'subboard:"<title>" first (open_board only navigates — no permission and no proposal). If the user ' +
  'rejects a proposal or denies a read, stop and explain — do not retry the same action. When you ' +
  'learn a durable preference about the user, call the remember tool.'

const ORCHESTRATOR_PROMPT =
  'You are the orchestrator: a helpful, conversational assistant that coordinates work across the app. ' +
  'You have NO feature tools of your own — your ONLY tools are update_plan, delegate, and remember. ' +
  'To do anything inside a feature (notes, kanban, …) you MUST delegate; never attempt feature actions ' +
  'yourself. When a request needs action, keep a plan with update_plan and carry out each step with ' +
  'delegate, which runs a focused subagent that has only that feature\'s tools and reports back. Pass ' +
  'any context a subagent needs inside its task (subagents cannot see this conversation). If a delegate ' +
  'fails, do NOT silently retry the same task — report what happened and ask the user how to proceed. ' +
  'Just chat normally when no action is needed. When you learn a durable preference about the user, ' +
  'call remember.'

const SEARCH_PROMPT =
  'You are a web research assistant. Use web_search(query, count?) to look things up on the web — the ' +
  'local model and the user\'s documents do not have live/current information. Every search leaves the ' +
  'device, so the user is asked to APPROVE each query first; if they deny it, stop and say so. Default to ' +
  '5 results; pass a higher count (up to 15) ONLY when the user explicitly wants more (e.g. a top-10 list). ' +
  'After results come back, write a concise answer that CITES its sources (title + link). Do NOT invent ' +
  'results — only use what web_search returned; if it returned nothing, say so. When you learn a durable ' +
  'preference about the user, call the remember tool. Your tools are: web_search, remember — no others.'

export interface AppServices {
  features: FeatureManifest[]
  layoutStores: Map<string, LayoutStore>
  broker: PermissionBroker
  memory: MemoryStore
  notesEngine: AgentEngine
  boardEngine: AgentEngine
  orchestratorEngine: AgentEngine
  sessionStore: OrchestratorSessionStore
  planStore: OrchestratorPlanStore
  docStore: DocEditorStore
  library: DocumentLibraryStore
  proposals: ProposalStore
  applier: ProposalApplier
  theme: ThemeStore
  agentAccent: AgentAccentStore
  kanban: KanbanStore
  kanbanNav: KanbanNavStore
  preview: PreviewStore
  searchResults: SearchResultsStore
  research: ResearchRegistry
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
  const memory = new MemoryStore(uid)
  const proposals = new ProposalStore(genId)
  const preview = new PreviewStore()
  const theme = new ThemeStore()
  const agentAccent = new AgentAccentStore()
  const docStore = new DocEditorStore('Untitled.md', '')
  const applier = new ProposalApplier(proposals)
  applier.register('doc-editor', (c) => docStore.applyChange(c.payload as { find: string; replace: string }))
  applier.register('doc-editor-append', (c) => { docStore.appendText((c.payload as { text: string }).text); return true })

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
  const library = new DocumentLibraryStore(docStore, storage.scope('doc-editor'), uid)
  await library.init()
  applier.register('doc-library', (c) => { void library.create((c.payload as { name?: string }).name); return true })
  await persistState(memory, storage.scope('memory'), 'entries')
  await persistState(theme, storage.scope('theme'), 'state')
  await persistState(agentAccent, storage.scope('ai-chat'), 'agent-accent')
  applyTheme(theme.getState().theme) // set initial attribute before first paint

  // Kanban: native board feature. Uses the collision-resistant `uid` (persisted).
  const kanban = new KanbanStore(uid)
  const kanbanNav = new KanbanNavStore()
  await persistState(kanban, storage.scope('kanban'), 'state')
  applier.register('kanban-board', (c) => kanban.applyProposal(c.payload as import('../modules/kanban/types').KanbanProposalPayload))
  applier.register('kanban-project', (c) => {
    const p = c.payload as { name: string; description?: string }
    kanban.createProject({ name: p.name, description: p.description })
    return true
  })

  // Web search: pluggable research providers; SearXNG adapter calls the local instance directly.
  // (Default URL is a constant for now; a Settings server-config will make it editable later.)
  const research = new ResearchRegistry()
  research.register(new SearxngProvider('http://localhost:8888'))
  const searchProvider = research.get('searxng')!
  const searchResults = new SearchResultsStore()

  // Inject live state into each feature agent's system prompt every run, so it knows the active
  // document / open board (and which sub-boards exist) instead of guessing.
  notesEngine.setContextProvider(() => describeNotesContext(library, docStore, proposals))
  boardEngine.setContextProvider(() => describeKanbanContext(kanban, kanbanNav, proposals))

  // Image blobs are stored locally in 'doc-images' scope (privacy: never uploaded).
  const imageScope = storage.scope('doc-images')
  const saveImage = async (file: File): Promise<string> => {
    const id = uid()
    await imageScope.set(id, file)
    return id
  }

  const notes = createNotesFeature({ docStore, library, engine: notesEngine, broker, memory, proposals, applier, accent: agentAccent, saveImage })
  const styleguide = createStyleGuideFeature()
  const clearAll = async () => {
    // "Clear all data": wipe everything but keep the theme preference, then reload a fresh workspace.
    const themeState = await storage.scope('theme').get('state')
    await storage.clear()
    if (themeState !== undefined) await storage.scope('theme').set('state', themeState)
    location.reload()
  }
  const settings = createSettingsFeature({ theme, memory, clearAll })
  const board = createBoardFeature({ store: kanban, nav: kanbanNav, engine: boardEngine, broker, accent: agentAccent, proposals, applier })

  const searchToolRegistry = new Registry()
  const searchEngine = new AgentEngine(client, searchToolRegistry, broker, 'search-chat')
  const search = createSearchFeature({ engine: searchEngine, broker, accent: agentAccent, provider: searchProvider, results: searchResults })

  // Register each feature's tools into ITS OWN registry, plus the global `remember` tool into both
  // (memory is workspace-wide; Settings has no agent so we register `remember` explicitly).
  const memoryModule = createMemoryViewerModule(memory)
  for (const mod of notes.modules) notesRegistry.register(mod.tools)
  for (const mod of board.modules) boardRegistry.register(mod.tools)
  notesRegistry.register(memoryModule.tools)
  boardRegistry.register(memoryModule.tools)
  for (const mod of search.modules) searchToolRegistry.register(mod.tools)
  searchToolRegistry.register(memoryModule.tools)

  // Orchestrator: a cross-cutting chatting agent that delegates to per-feature subagents.
  const orchestratorRegistry = new Registry()
  const orchestratorEngine = new AgentEngine(client, orchestratorRegistry, broker, 'orchestrator', 10)

  const featureAgents: FeatureAgentRegistry = new Map([
    ['notes', { id: 'notes', title: 'Notes', description: "Read, edit, and create the user's markdown documents.", registry: notesRegistry, prompt: NOTES_PROMPT, contextProvider: () => describeNotesContext(library, docStore, proposals) }],
    ['kanban', { id: 'kanban', title: 'Kanban', description: 'Manage kanban boards: create boards, open them, create and move cards.', registry: boardRegistry, prompt: BOARD_PROMPT, contextProvider: () => describeKanbanContext(kanban, kanbanNav, proposals) }],
    ['search', { id: 'search', title: 'Search', description: 'Search the WEB for up-to-date information (news, travel ideas, current facts) the local model and documents lack. Returns cited results; the user approves each query before it is sent.', registry: searchToolRegistry, prompt: SEARCH_PROMPT, informational: true }],
  ])

  const sessionStore = new OrchestratorSessionStore(storage.scope('orchestrator-sessions'), uid)
  await sessionStore.init()
  const planStore = new OrchestratorPlanStore(storage.scope('orchestrator-plan'), uid)
  await planStore.init(sessionStore.getState().activeId)

  orchestratorEngine.setContextProvider(() => describeOrchestratorContext(planStore, featureAgents))

  const orchestratorTools = createOrchestratorTools({
    plan: planStore, featureAgents, client, broker, surfaceId: 'orchestrator', proposals, preview,
  })
  orchestratorRegistry.register(orchestratorTools)
  orchestratorRegistry.register(memoryModule.tools)

  const previewRenderers = {
    notes: notes.modules.find((m) => m.id === 'doc-editor')!.render,
    kanban: board.modules.find((m) => m.id === 'kanban-board')!.render,
  }

  const orchestrator = createOrchestratorFeature({
    engine: orchestratorEngine, broker, accent: agentAccent, sessions: sessionStore, plan: planStore,
    proposals, applier, preview, previewRenderers,
  })

  await createFeatureChatController({
    engine: orchestratorEngine,
    scope: storage.scope('orchestrator-chat'),
    systemPrompt: ORCHESTRATOR_PROMPT,
    getKey: () => sessionStore.getState().activeId,
    source: sessionStore,
    listValidKeys: () => sessionStore.getState().sessions.map((s) => s.id),
  })

  let lastSession = sessionStore.getState().activeId
  sessionStore.subscribe(() => {
    const st = sessionStore.getState()
    void planStore.pruneExcept(st.sessions.map((s) => s.id))
    if (st.activeId !== lastSession) {
      lastSession = st.activeId
      preview.focus(null) // each session starts with an empty preview until it delegates
      void planStore.switchTo(st.activeId)
    }
  })

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
  await createFeatureChatController({
    engine: searchEngine,
    scope: storage.scope('search-chat'),
    systemPrompt: SEARCH_PROMPT,
    getKey: () => 'search',
    source: { subscribe: () => () => {} },
  })

  const layoutStores = new Map<string, LayoutStore>()
  for (const feature of [notes, styleguide, settings, board, search, orchestrator]) {
    const ls = new LayoutStore(feature.layout)
    await persistState(ls, storage.scope('layout'), feature.id)
    layoutStores.set(feature.id, ls)
  }

  return { features: [notes, styleguide, settings, board, search, orchestrator], layoutStores, broker, memory, notesEngine, boardEngine, orchestratorEngine, sessionStore, planStore, docStore, library, proposals, applier, theme, agentAccent, kanban, kanbanNav, preview, searchResults, research }
}
