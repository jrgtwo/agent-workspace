import { PermissionBroker } from '../core/permissionBroker'
import { MemoryStore } from '../core/memoryStore'
import { ProposalStore } from '../core/proposalStore'
import { LlamaClient } from '../core/llamaClient'
import { Registry } from '../core/registry'
import { AgentEngine } from '../core/agentEngine'
import { ThemeStore, applyTheme } from '../core/themeStore'
import { DocEditorStore } from '../modules/docEditor/docEditorStore'
import { createNotesFeature } from '../features/notes'
import { DocumentLibraryStore } from '../modules/docEditor/documentLibraryStore'
import { createStorage } from '../core/storage/storage'
import { persistState, debounce } from '../core/storage/persistState'
import type { StorageBackend } from '../core/storage/types'
import type { ChatMessage, FeatureManifest } from '../core/types'

let seq = 0
const genId = () => `id-${++seq}`

const SYSTEM_PROMPT =
  'You are a local, privacy-first writing assistant embedded in a notes app. ' +
  "You can read and edit the user's document and remember durable facts, but every " +
  'read/write requires explicit user permission via tools. Prefer reading the document ' +
  'before editing. When you learn a durable preference about the user, call the remember tool.'

export interface AppServices {
  features: FeatureManifest[]
  broker: PermissionBroker
  memory: MemoryStore
  engine: AgentEngine
  docStore: DocEditorStore
  library: DocumentLibraryStore
  proposals: ProposalStore
  theme: ThemeStore
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
  const docStore = new DocEditorStore('Untitled.md', '')
  const registry = new Registry()

  const env = import.meta.env as unknown as Record<string, string | undefined>
  const baseUrl = env.VITE_LLAMA_URL ?? 'http://localhost:8080/v1'
  const model = env.VITE_LLAMA_MODEL ?? 'local'
  const client = opts?.client ?? new LlamaClient(baseUrl, model)

  const engine = new AgentEngine(client, registry, broker, 'ai-chat')

  // The document library owns the 'doc-editor' scope (index/active/doc:<id>) and hydrates
  // the active document into docStore. Memory persists via the declarative helper.
  const library = new DocumentLibraryStore(docStore, storage.scope('doc-editor'), genId)
  await library.init()
  await persistState(memory, storage.scope('memory'), 'entries')
  await persistState(theme, storage.scope('theme'), 'state')
  applyTheme(theme.getState().theme) // set initial attribute before first paint

  // Chat: custom hookup because the system prompt is re-seeded each launch.
  const chatScope = storage.scope('chat')
  const savedMessages = await chatScope.get<ChatMessage[]>('messages')
  engine.hydrateMessages(savedMessages ?? [])
  engine.seedSystem(SYSTEM_PROMPT)
  const saveChat = debounce(() => { void chatScope.set('messages', engine.getState().messages) }, 400)
  engine.subscribe(saveChat)

  // Image blobs are stored locally in 'doc-images' scope (privacy: never uploaded).
  // IndexedDB stores Blob via structured clone; MemoryBackend stores it in-memory for tests.
  const imageScope = storage.scope('doc-images')
  const saveImage = async (file: File): Promise<string> => {
    const id = genId()
    await imageScope.set(id, file)
    return id
  }

  const notes = createNotesFeature({ docStore, library, engine, broker, memory, proposals, saveImage })
  for (const feature of [notes]) {
    for (const mod of feature.modules) registry.register(mod.tools)
  }

  return { features: [notes], broker, memory, engine, docStore, library, proposals, theme }
}
