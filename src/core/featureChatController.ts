import { debounce } from './storage/persistState'
import type { ScopedStore } from './storage/types'
import type { ChatMessage } from './types'

/** The slice of AgentEngine the controller drives. AgentEngine satisfies this structurally. */
export interface ControllableEngine {
  subscribe(cb: () => void): () => void
  getState(): { messages: ChatMessage[]; busy: boolean }
  hydrateMessages(messages: ChatMessage[]): void
  seedSystem(prompt: string): void
  stop(): void
}

export interface FeatureChatController {
  dispose(): void
}

export interface FeatureChatOptions {
  engine: ControllableEngine
  scope: ScopedStore
  systemPrompt: string
  /** Current working-context key (e.g. active doc id, or a board/project id). An empty string
   *  means "no active context" and is treated as a no-op (no thread swap). */
  getKey: () => string
  /** Emitter to watch for context changes (the library / nav store). */
  source: { subscribe(cb: () => void): () => void }
  /** If provided, threads whose key is not returned here are pruned on context change. */
  listValidKeys?: () => string[]
}

/**
 * Binds one AgentEngine to per-context chat threads in `scope`. The engine always holds the
 * *active* context's conversation; on context change the outgoing thread is flush-saved and the
 * incoming one is loaded. An in-flight run is aborted before swapping so a streaming response
 * can't bleed across threads. Orphaned threads are optionally pruned.
 */
export async function createFeatureChatController(
  opts: FeatureChatOptions,
): Promise<FeatureChatController> {
  const { engine, scope, systemPrompt, getKey, source, listValidKeys } = opts
  let currentKey = getKey()

  const writeCurrent = () => {
    if (currentKey) void scope.set(currentKey, engine.getState().messages)
  }
  const debouncedSave = debounce(writeCurrent, 400)

  const loadInto = async (key: string) => {
    const saved = (await scope.get<ChatMessage[]>(key)) ?? []
    engine.hydrateMessages(saved)
    engine.seedSystem(systemPrompt)
  }

  // Hydrate the active context first, then start tracking engine changes.
  await loadInto(currentKey)
  const unsubEngine = engine.subscribe(debouncedSave)

  const prune = async () => {
    if (!listValidKeys) return
    const valid = new Set(listValidKeys())
    for (const key of await scope.keys()) {
      if (key !== currentKey && !valid.has(key)) await scope.delete(key)
    }
  }

  const onSourceChange = () => {
    void prune()
    const nextKey = getKey()
    if (!nextKey || nextKey === currentKey) return
    if (engine.getState().busy) engine.stop()
    writeCurrent() // flush outgoing thread before switching
    currentKey = nextKey
    // Fire-and-forget: a rapid A→B→C switch could let an earlier load resolve after a later
    // one. Acceptable for the expected UX cadence; add a generation counter here if it bites.
    void loadInto(currentKey)
  }
  const unsubSource = source.subscribe(onSourceChange)

  return {
    dispose() {
      unsubEngine()
      unsubSource()
    },
  }
}
