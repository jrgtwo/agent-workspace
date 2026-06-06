import { PermissionBroker } from '../core/permissionBroker'
import { MemoryStore } from '../core/memoryStore'
import { LlamaClient } from '../core/llamaClient'
import { Registry } from '../core/registry'
import { AgentEngine } from '../core/agentEngine'
import { DocEditorStore } from '../modules/docEditor/docEditorStore'
import { createNotesFeature } from '../features/notes'
import type { FeatureManifest } from '../core/types'

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
}

/**
 * Construct the workspace's core services and wire module tools into the registry.
 * Pass `opts.client` (a stub with a `chat` method) to bypass the real llama-server in tests.
 */
export function createServices(opts?: { client?: Pick<LlamaClient, 'chat'> }): AppServices {
  const broker = new PermissionBroker(genId)
  const memory = new MemoryStore('workspace-memory', genId)
  const docStore = new DocEditorStore('Untitled.md', '')
  const registry = new Registry()

  const env = import.meta.env as unknown as Record<string, string | undefined>
  const baseUrl = env.VITE_LLAMA_URL ?? 'http://localhost:8080/v1'
  const model = env.VITE_LLAMA_MODEL ?? 'local'
  const client = opts?.client ?? new LlamaClient(baseUrl, model)

  const engine = new AgentEngine(client, registry, broker)
  engine.seedSystem(SYSTEM_PROMPT)

  const notes = createNotesFeature({ docStore, engine, broker, memory })
  // Collect tools from every module in every feature so the agent can call them.
  for (const feature of [notes]) {
    for (const mod of feature.modules) registry.register(mod.tools)
  }

  return { features: [notes], broker, memory, engine, docStore }
}
