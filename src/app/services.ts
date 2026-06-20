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
import { ComposerDraftStore } from '../modules/aiChat/composer/composerDraftStore'
import { DocEditorStore } from '../modules/docEditor/docEditorStore'
import { createMemoryViewerModule } from '../modules/memoryViewer/memoryViewerModule'
import { createNotesFeature } from '../features/notes'
import { createStyleGuideFeature } from '../features/styleguide'
import { createSettingsFeature } from '../features/settings'
import { createBoardFeature } from '../features/board'
import { createOrchestratorFeature } from '../features/orchestrator'
import { ResearchRegistry } from '../core/research/researchRegistry'
import { SearxngProvider } from '../core/research/searxngProvider'
import { GeoRegistry } from '../core/geo/geoRegistry'
import { OsmGeoProvider } from '../core/geo/osmGeoProvider'
import { createThrottledGeoProvider } from '../core/geo/throttledGeoProvider'
import { OverpassProvider } from '../core/geo/overpassProvider'
import { createStopLocator } from '../modules/trip/locate'
import { SearchResultsStore } from '../modules/search/searchResultsStore'
import { createSearchFeature } from '../features/search'
import { OrchestratorSessionStore } from '../modules/orchestrator/sessionStore'
import { OrchestratorPlanStore } from '../modules/orchestrator/planStore'
import { PreviewStore } from '../modules/orchestrator/previewStore'
import { createOrchestratorTools, type FeatureAgentRegistry } from '../modules/orchestrator/orchestratorTools'
import { describeOrchestratorContext } from '../modules/orchestrator/context'
import { KanbanStore } from '../modules/kanban/kanbanStore'
import { KanbanNavStore } from '../modules/kanban/kanbanNavStore'
import { TripStore } from '../modules/trip/tripStore'
import { createTripFeature } from '../features/trip'
import { createTripTools } from '../modules/trip/tripTools'
import { describeTripContext } from '../modules/trip/context'
import { EntityStore } from '../modules/graph/entityStore'
import { createGraphFeature } from '../features/graph'
import { createGraphTools } from '../modules/graph/graphTools'
import { describeGraphContext } from '../modules/graph/context'
import type { GraphProposalPayload } from '../modules/graph/types'
import { describeKanbanContext } from '../modules/kanban/context'
import { DocumentLibraryStore } from '../modules/docEditor/documentLibraryStore'
import { describeNotesContext } from '../modules/docEditor/context'
import { McpClient } from '../core/mcp/mcpClient'
import { McpStore } from '../core/mcp/mcpStore'
import { toToolDefs } from '../core/mcp/mcpAdapter'
import { createOpenInViewerTool } from '../modules/connectors/openInViewerTool'
import { ConnectorsTreeStore } from '../modules/connectors/connectorsTreeStore'
import { OpenDocsStore } from '../modules/connectors/openDocsStore'
import { describeConnectorsContext } from '../modules/connectors/context'
import { createConnectorsFeature } from '../features/connectors'
import { buildRegistry, type PanelType, type PanelRegistry } from '../core/panelRegistry'
import { ViewsStore } from '../modules/views/viewsStore'
import { DEFAULT_VIEWS } from '../modules/views/defaultViews'
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

const TRIP_PROMPT =
  'You are a local, privacy-first travel-planning assistant embedded in a map-based trip planner. ' +
  'You help the user research and BUILD day-by-day itineraries. Your tools are: web_search, ' +
  'search_places, create_itinerary, propose_stops, remember — you have no others. ' +
  'To build a new itinerary from a request (e.g. "a 3-day Maui itinerary of the top sights"): first use ' +
  'web_search to research ideas if you need them (each web search asks the user to approve sending the ' +
  'query), THEN you MUST call create_itinerary to actually build it — describing the itinerary in your ' +
  'reply does NOTHING; only calling the tool creates it. Call create_itinerary ONCE with a `title`, a ' +
  '`destination` (the region, e.g. "Kauai, Hawaii" — ALWAYS include it so stops are placed on the right ' +
  'island and not confused with same-named places elsewhere), and a single FLAT `stops` array, where ' +
  'each stop has a `day` label (e.g. "Day 1") and a `name`; stops are grouped into days by their day ' +
  'label. You do NOT need coordinates — the map looks up each stop by name within the destination. ' +
  'When a `name` is an activity rather than a place (e.g. "Dinner at Tidepools Restaurant"), ALSO set ' +
  '`place` to the bare venue or town to pin (e.g. "Tidepools Restaurant") so the map can find it. ' +
  'To add stops to the CURRENT trip\'s focused day instead of building a new trip, use propose_stops. ' +
  '(search_places is only for fetching a specific place\'s coordinates and needs online maps enabled; you ' +
  'usually will not need it.) ' +
  'Everything you create is PROPOSED as a pending change the user accepts or rejects in the UI (there is ' +
  'no permission popup for proposals, and nothing changes until they accept) — just call the tool and let ' +
  'them decide. If the user rejects a proposal or denies a web search, stop and explain — do not retry. ' +
  'When you learn a durable preference about the user, call remember.'

const GRAPH_PROMPT =
  'You are a local, privacy-first assistant embedded in a "Graph" workspace of typed entities ' +
  '(records) that the user views as a list or a status board. Your tools are: create_entities, ' +
  'link_entities, update_entity, remember — you have no others. To add records, gather them ALL and ' +
  'call create_entities ONCE with a list (never one call per entity); each entity has a type, a title, ' +
  'an optional status ("To Do"/"Doing"/"Done"), and an optional body. To connect records, call ' +
  'link_entities with { from, to } pairs naming entities by their EXACT title. To change one, call ' +
  'update_entity by exact title. Everything you create is PROPOSED as a pending change the user accepts ' +
  'or rejects in the UI (no permission popup, nothing changes until they accept) — just call the tool ' +
  'and let them decide. If the user rejects a proposal, stop and explain — do not retry. When you learn ' +
  'a durable preference about the user, call remember.'

const SEARCH_PROMPT =
  'You are a web research assistant. Use web_search(query, count?) to look things up on the web — the ' +
  'local model and the user\'s documents do not have live/current information. Every search leaves the ' +
  'device, so the user is asked to APPROVE each query first; if they deny it, stop and say so. Default to ' +
  '5 results; pass a higher count (up to 15) ONLY when the user explicitly wants more (e.g. a top-10 list). ' +
  'After results come back, write a concise answer that CITES its sources (title + link). Do NOT invent ' +
  'results — only use what web_search returned; if it returned nothing, say so. When you learn a durable ' +
  'preference about the user, call the remember tool. Your tools are: web_search, remember — no others.'

const CONNECTORS_PROMPT =
  'You are a local, privacy-first assistant with access to external "connector" tools the user plugged ' +
  'in via MCP. The connector tools currently available are listed in your context each turn — use them ' +
  'to fulfill the request. Each connector call asks the user to APPROVE it first; if they deny, stop and ' +
  'explain — do not retry. If no connector tools are available, tell the user the MCP bridge may not be ' +
  'running (they can start it and hit Refresh). To SHOW the user a file, call open_in_viewer with its ' +
  'path — its contents load into the viewer pane beside this chat, where the user can edit it and ' +
  'click Save to write changes back to the file. You cannot save files yourself yet. Do not invent ' +
  'tool results — only report what a tool returned. When you learn a durable preference about the ' +
  'user, call remember.'

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
  trip: TripStore
  graph: EntityStore
  preview: PreviewStore
  searchResults: SearchResultsStore
  research: ResearchRegistry
  geo: GeoRegistry
  mcp: McpStore
  registry: PanelRegistry
  viewsStore: ViewsStore
}

export interface CreateServicesOpts {
  client?: Pick<LlamaClient, 'chat'>
  backend?: StorageBackend
  mcpClient?: Pick<McpClient, 'listTools' | 'call'>
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
  const tripRegistry = new Registry()
  const notesEngine = new AgentEngine(client, notesRegistry, broker, 'notes-chat')
  const boardEngine = new AgentEngine(client, boardRegistry, broker, 'board-chat')
  const tripEngine = new AgentEngine(client, tripRegistry, broker, 'trip-chat')

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

  // Trip planner: its own store + scope. Auto-create a starter trip on a fresh workspace.
  const trip = new TripStore(uid)
  await persistState(trip, storage.scope('trip'), 'state')
  if (!trip.getState().trips.length) trip.createTrip('My Trip')

  // Graph: the unified entity-graph proving ground. Own scope, isolated from the other features.
  const graph = new EntityStore(uid)
  await persistState(graph, storage.scope('graph'), 'state')
  applier.register('graph', (c) => graph.applyProposal(c.payload as GraphProposalPayload))
  if (!graph.getState().entities.length) {
    // Seed a tiny cross-linked demo set so the List⇄Board "flip the view" magic is visible on first open.
    const brief = graph.create({ type: 'task', title: 'Draft project brief', status: 'To Do' })
    const review = graph.create({ type: 'task', title: 'Review brief', status: 'Doing', body: 'Check scope and risks.' })
    graph.create({ type: 'task', title: 'Ship v1', status: 'Done' })
    const ideas = graph.create({ type: 'note', title: 'Ideas', body: 'Loose thoughts to fold into the brief.' })
    graph.link(review, brief)   // Review → Draft (backlink on Draft)
    graph.link(brief, ideas)    // Draft → Ideas
  }

  applier.register('kanban-board', (c) => kanban.applyProposal(c.payload as import('../modules/kanban/types').KanbanProposalPayload))
  applier.register('kanban-project', (c) => {
    const p = c.payload as { name: string; description?: string }
    kanban.createProject({ name: p.name, description: p.description })
    return true
  })
  applier.register('trip', (c) => trip.applyProposal(c.payload as import('../modules/trip/types').TripProposalPayload))

  // Web search: pluggable research providers; SearXNG adapter calls the local instance directly.
  // (Default URL is a constant for now; a Settings server-config will make it editable later.)
  const research = new ResearchRegistry()
  research.register(new SearxngProvider('http://localhost:8888'))
  const searchProvider = research.get('searxng')!
  const searchResults = new SearchResultsStore()

  // Geo: pluggable geocoding/routing. Default OSM (Nominatim + OSRM); self-host later via the seam.
  const geo = new GeoRegistry()
  geo.register(new OsmGeoProvider({
    nominatimUrl: env.VITE_NOMINATIM_URL ?? '/nominatim',
    osrmUrl: env.VITE_OSRM_URL ?? '/osrm',
  }))
  // Serialize + cache geocoding so the map's per-day burst doesn't trip the public endpoints' rate limit.
  const geoProvider = createThrottledGeoProvider(geo.get('osm')!)
  // Stop locator: Nominatim primary, then an Overpass fuzzy-name fallback (within the destination bbox)
  // for POIs the geocoder won't surface ("Leoda's Kitchen & Pie Shop" → OSM's "Leodas Kitchen and Pie Shop").
  const overpass = new OverpassProvider({ url: env.VITE_OVERPASS_URL ?? '/overpass' })
  const stopLocator = createStopLocator({ geo: geoProvider, overpass })

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
  const tripFeature = createTripFeature({ store: trip, engine: tripEngine, broker, accent: agentAccent, provider: geoProvider, locate: stopLocator.locate, proposals, applier })

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
  for (const mod of tripFeature.modules) tripRegistry.register(mod.tools)
  for (const mod of search.modules) tripRegistry.register(mod.tools) // Trip can also web-search (research) to build itineraries
  tripRegistry.register(createTripTools({ store: trip, proposals, geocode: (q) => geoProvider.geocode(q) }))
  tripRegistry.register(memoryModule.tools)
  tripEngine.setContextProvider(() => describeTripContext(trip))

  const graphRegistry = new Registry()
  const graphEngine = new AgentEngine(client, graphRegistry, broker, 'graph-chat')
  const graphFeature = createGraphFeature({ store: graph, engine: graphEngine, broker, accent: agentAccent })
  for (const mod of graphFeature.modules) graphRegistry.register(mod.tools)
  graphRegistry.register(createGraphTools({ store: graph, proposals }))
  graphRegistry.register(memoryModule.tools)
  graphEngine.setContextProvider(() => describeGraphContext(graph))

  // Connectors (MCP): tools come from a local bridge over HTTP. Browser never speaks MCP directly.
  const mcpStore = new McpStore()
  const mcpClient = (opts?.mcpClient ?? new McpClient(env.VITE_MCP_URL ?? '/mcp')) as McpClient
  const connectorsRegistry = new Registry()
  const connectorsEngine = new AgentEngine(client, connectorsRegistry, broker, 'connectors-chat')
  connectorsRegistry.register(memoryModule.tools) // memory is always available
  // OpenDocsStore owns multi-tab open docs for the connectors viewer (transient, no persistence).
  const openDocs = new OpenDocsStore(mcpClient)
  connectorsRegistry.register([createOpenInViewerTool({ open: openDocs })])
  // File-tree browse: human-driven, so it reads the bridge directly (no broker prompt), like Save.
  const connectorsTree = new ConnectorsTreeStore({ client: mcpClient })
  void connectorsTree.load() // resilient: errors land in tree state, app still boots
  // (Re)load connector tools from the bridge. Resilient: if the bridge is down the app still boots.
  const loadConnectors = async () => {
    mcpStore.setLoading()
    try {
      const tools = await mcpClient.listTools()
      connectorsRegistry.register(toToolDefs(tools, { client: mcpClient, connectorId: 'filesystem', locality: 'LOCAL' }))
      mcpStore.setReady(tools.map((t) => ({ name: t.name, description: t.description })))
    } catch (err) {
      mcpStore.setError(err instanceof Error ? err.message : String(err))
    }
  }
  await loadConnectors()
  connectorsEngine.setContextProvider(() => describeConnectorsContext(mcpStore))
  const connectorsDraft = new ComposerDraftStore()
  const connectorsFeature = createConnectorsFeature({
    mcp: mcpStore, onRefresh: () => void loadConnectors(), engine: connectorsEngine, broker, accent: agentAccent, draft: connectorsDraft, open: openDocs,
    tree: connectorsTree,
    onOpenFile: (path: string) => void openDocs.open(path),
    onTreeRefresh: () => void connectorsTree.load(),
  })

  // Composable Views: a registry of panel types (reusing the connectors feature's own module
  // instances + the shared memory module) feeds the ViewsStore (seeded with the built-in views).
  const connectorsModules = new Map(connectorsFeature.modules.map((m) => [m.id, m]))
  const panelRegistry = buildRegistry([
    { id: 'connectors-tree', label: 'File tree', icon: '📁', module: connectorsModules.get('connectors-tree')! },
    { id: 'connectors-viewer', label: 'Document viewer', icon: '📄', module: connectorsModules.get('connectors-viewer')! },
    { id: 'ai-chat', label: 'AI chat', icon: '💬', module: connectorsModules.get('ai-chat')! },
    { id: memoryModule.id, label: 'Memory', icon: '🧠', module: memoryModule },
  ] as PanelType[])
  const viewsStore = new ViewsStore(DEFAULT_VIEWS, panelRegistry)
  await persistState(viewsStore, storage.scope('views'), 'all')

  // Orchestrator: a cross-cutting chatting agent that delegates to per-feature subagents.
  const orchestratorRegistry = new Registry()
  const orchestratorEngine = new AgentEngine(client, orchestratorRegistry, broker, 'orchestrator', 10)

  const featureAgents: FeatureAgentRegistry = new Map([
    ['notes', { id: 'notes', title: 'Notes', description: "Read, edit, and create the user's markdown documents.", registry: notesRegistry, prompt: NOTES_PROMPT, contextProvider: () => describeNotesContext(library, docStore, proposals) }],
    ['kanban', { id: 'kanban', title: 'Kanban', description: 'Manage kanban boards: create boards, open them, create and move cards.', registry: boardRegistry, prompt: BOARD_PROMPT, contextProvider: () => describeKanbanContext(kanban, kanbanNav, proposals) }],
    ['search', { id: 'search', title: 'Search', description: 'Search the WEB for up-to-date information (news, travel ideas, current facts) the local model and documents lack. Returns cited results; the user approves each query before it is sent.', registry: searchToolRegistry, prompt: SEARCH_PROMPT, informational: true }],
    ['trip', { id: 'trip', title: 'Trip', description: 'Research destinations and BUILD a complete day-by-day travel itinerary on a map (create_itinerary creates the whole trip), or add stops to an existing trip. Delegate here to PLAN or BUILD any trip or itinerary.', registry: tripRegistry, prompt: TRIP_PROMPT, contextProvider: () => describeTripContext(trip) }],
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
    trip: tripFeature.modules.find((m) => m.id === 'trip-day-strip')!.render,
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
  await createFeatureChatController({
    engine: tripEngine,
    scope: storage.scope('trip-chat'),
    systemPrompt: TRIP_PROMPT,
    getKey: () => trip.getState().activeId ?? '__no_trip__',
    source: trip,
  })
  await createFeatureChatController({
    engine: graphEngine,
    scope: storage.scope('graph-chat'),
    systemPrompt: GRAPH_PROMPT,
    getKey: () => 'graph',
    source: { subscribe: () => () => {} },
  })
  await createFeatureChatController({
    engine: connectorsEngine,
    scope: storage.scope('connectors-chat'),
    systemPrompt: CONNECTORS_PROMPT,
    getKey: () => 'connectors',
    source: { subscribe: () => () => {} },
  })

  const layoutStores = new Map<string, LayoutStore>()
  for (const feature of [notes, styleguide, settings, board, search, orchestrator, tripFeature, graphFeature, connectorsFeature]) {
    const ls = new LayoutStore(feature.layout)
    await persistState(ls, storage.scope('layout'), feature.id)
    layoutStores.set(feature.id, ls)
  }

  return { features: [notes, styleguide, settings, board, search, orchestrator, tripFeature, graphFeature, connectorsFeature], layoutStores, broker, memory, notesEngine, boardEngine, orchestratorEngine, sessionStore, planStore, docStore, library, proposals, applier, theme, agentAccent, kanban, kanbanNav, preview, searchResults, research, geo, trip, graph, mcp: mcpStore, registry: panelRegistry, viewsStore }
}
