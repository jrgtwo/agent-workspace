# Local AI Workspace — Notes Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **PROJECT RULE — NO GIT:** The implementer must NOT run any git command. Where this plan
> says **CHECKPOINT**, stop, give the user a short progress summary, and let *the user* run
> the commit. Suggested commit messages are provided for the user's convenience only.

**Goal:** Build a fully-local, privacy-first Notes workspace where a tool-using agent (backed by llama.cpp) can read and edit the user's document only after explicit permission, and can save learned takeaways to an inspectable memory store.

**Architecture:** Framework-agnostic core services (Permission Broker, Memory Store, llama.cpp client, Agent Engine, Registry) implemented as plain TypeScript classes with a tiny subscribe/notify Emitter. React modules (Doc Editor, AI Chat, Permission Prompt, Memory Viewer) are reusable panels; a Feature is a declarative manifest that composes modules into a tiled layout. The shell renders the active feature's layout. Nothing leaves the device except calls to localhost llama-server.

**Tech Stack:** Vite + React + TypeScript, Vitest + @testing-library/react (jsdom), react-resizable-panels for the tiled layout, browser localStorage for persistence, llama.cpp `llama-server` (OpenAI-compatible API) for inference.

---

## File Structure

```
src/
  core/
    emitter.ts              # tiny subscribe/notify base + useStore React hook
    types.ts                # WorkspaceModule, FeatureManifest, ToolDef, PermissionScope, MemoryEntry, ChatMessage
    permissionBroker.ts     # gates every read/write; default-deny; LOCAL/NETWORK tracking
    memoryStore.ts          # localStorage-backed, user-inspectable learned facts
    llamaClient.ts          # OpenAI-compatible streaming client to llama-server
    registry.ts             # collects tools from modules
    agentEngine.ts          # the agent loop: stream, tool-call, permission-gate, feed back
  modules/
    docEditor/
      docEditorStore.ts     # current document text (subscribable)
      docEditorModule.tsx   # panel UI + read_document / apply_edit tools
    aiChat/
      aiChatModule.tsx      # chat panel wired to AgentEngine
    permissionPrompt/
      permissionPromptModule.tsx  # renders pending permission requests
    memoryViewer/
      memoryViewerModule.tsx      # memory list + delete; remember tool
  features/
    notes.ts                # Notes feature manifest (composes the 4 modules)
  shell/
    PanelArea.tsx           # renders a manifest layout via react-resizable-panels
    FeatureRail.tsx         # left rail feature menu
    WorkspaceShell.tsx      # rail + panel area
  app/
    services.ts             # constructs the singleton core services + wires module tools
    AppProviders.tsx        # React context exposing services
  App.tsx
  main.tsx
```

Each file has one responsibility. Core services are framework-agnostic so they can be unit-tested without React. Modules close over their stores and contribute tools to the Registry.

---

### Task 1: Scaffold project and test harness

**Files:**
- Create: project scaffold (Vite react-ts) in the current directory
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `package.json` (scripts + deps)

- [ ] **Step 1: Scaffold Vite app in current directory**

Run:
```bash
npm create vite@latest . -- --template react-ts
```
When prompted about the non-empty directory, choose **"Ignore files and continue"** (it will not touch `docs/` or `.superpowers/`).

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install
npm install react-resizable-panels
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 3: Create Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 4: Create test setup**

Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Add test scripts**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Sanity test**

Create `src/test/sanity.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 7: Run it**

Run: `npm test`
Expected: PASS, 1 test passing.

- [ ] **CHECKPOINT** — Pause, summarize ("project scaffolded, test harness green"), let the user commit. Suggested message: `chore: scaffold vite+react+ts with vitest`.

---

### Task 2: Core types and Emitter

**Files:**
- Create: `src/core/emitter.ts`
- Create: `src/core/types.ts`
- Test: `src/core/emitter.test.ts`

- [ ] **Step 1: Write the failing test for Emitter**

Create `src/core/emitter.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { Emitter } from './emitter'

class Counter extends Emitter<{ n: number }> {
  state = { n: 0 }
  getState = () => this.state
  inc() { this.state = { n: this.state.n + 1 }; this.notify() }
}

describe('Emitter', () => {
  it('notifies subscribers and returns a stable snapshot until mutation', () => {
    const c = new Counter()
    const listener = vi.fn()
    const unsub = c.subscribe(listener)
    const before = c.getState()
    c.inc()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(c.getState()).not.toBe(before)
    expect(c.getState().n).toBe(1)
    unsub()
    c.inc()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- emitter`
Expected: FAIL — cannot find module './emitter'.

- [ ] **Step 3: Implement Emitter**

Create `src/core/emitter.ts`:
```ts
import { useSyncExternalStore } from 'react'

export abstract class Emitter<TState> {
  private listeners = new Set<() => void>()
  abstract getState(): TState
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  protected notify(): void {
    this.listeners.forEach((l) => l())
  }
}

export function useStore<TState>(store: {
  subscribe: (l: () => void) => () => void
  getState: () => TState
}): TState {
  return useSyncExternalStore(store.subscribe, store.getState)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- emitter`
Expected: PASS.

- [ ] **Step 5: Create shared types (no test — pure type declarations)**

Create `src/core/types.ts`:
```ts
// ---- Permissions ----
export type PermissionKind = 'read' | 'write'
export type DataLocality = 'LOCAL' | 'NETWORK'

export interface PermissionScope {
  kind: PermissionKind
  resource: string          // e.g. "document:Untitled.md"
  locality: DataLocality
  describe: (args: unknown) => string  // human sentence, e.g. "Read Untitled.md?"
}

export interface PermissionRequest {
  id: string
  scope: PermissionScope
  detail: string            // resolved describe(args)
  resolve: (allowed: boolean) => void
}

// ---- Agent tools ----
export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>   // JSON Schema
  permission?: PermissionScope           // if set, gated before execution
  handler: (args: any) => Promise<unknown> | unknown
}

// ---- Chat ----
export type ChatRole = 'user' | 'assistant' | 'tool' | 'system'
export interface ToolCall { id: string; name: string; arguments: string }
export interface ChatMessage {
  role: ChatRole
  content: string
  toolCalls?: ToolCall[]
  toolCallId?: string       // for role 'tool'
}

// ---- Memory ----
export interface MemoryEntry {
  id: string
  text: string
  createdAt: number
}

// ---- Modules & Features ----
export interface ModuleLayoutHints {
  defaultSize?: number      // percent
  collapsible?: boolean
  minSize?: number
}
export interface WorkspaceModule {
  id: string
  title: string
  locality: DataLocality
  tools: ToolDef[]
  render: () => JSX.Element
  layoutHints?: ModuleLayoutHints
}

export type LayoutNode =
  | { type: 'panel'; moduleId: string; size?: number; collapsible?: boolean }
  | { type: 'split'; direction: 'horizontal' | 'vertical'; children: LayoutNode[]; size?: number }

export interface FeatureManifest {
  id: string
  name: string
  icon: string
  modules: WorkspaceModule[]
  layout: LayoutNode
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **CHECKPOINT** — Summarize, let the user commit. Suggested: `feat(core): add Emitter base and shared types`.

---

### Task 3: Permission Broker

**Files:**
- Create: `src/core/permissionBroker.ts`
- Test: `src/core/permissionBroker.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/permissionBroker.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { PermissionBroker } from './permissionBroker'
import type { PermissionScope } from './types'

const readScope: PermissionScope = {
  kind: 'read',
  resource: 'document:Untitled.md',
  locality: 'LOCAL',
  describe: () => 'Read Untitled.md?',
}

describe('PermissionBroker', () => {
  it('enqueues a request and resolves true when allowed', async () => {
    const broker = new PermissionBroker(() => 'id-1')
    const promise = broker.request(readScope, {})
    expect(broker.getState().pending).toHaveLength(1)
    expect(broker.getState().pending[0].detail).toBe('Read Untitled.md?')
    broker.allow('id-1')
    await expect(promise).resolves.toBe(true)
    expect(broker.getState().pending).toHaveLength(0)
  })

  it('resolves false when denied (default-deny semantics)', async () => {
    const broker = new PermissionBroker(() => 'id-2')
    const promise = broker.request(readScope, {})
    broker.deny('id-2')
    await expect(promise).resolves.toBe(false)
    expect(broker.getState().pending).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- permissionBroker`
Expected: FAIL — cannot find module './permissionBroker'.

- [ ] **Step 3: Implement**

Create `src/core/permissionBroker.ts`:
```ts
import { Emitter } from './emitter'
import type { PermissionRequest, PermissionScope } from './types'

interface BrokerState { pending: PermissionRequest[] }

export class PermissionBroker extends Emitter<BrokerState> {
  private state: BrokerState = { pending: [] }
  constructor(private genId: () => string) { super() }

  getState = (): BrokerState => this.state

  request(scope: PermissionScope, args: unknown): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const req: PermissionRequest = {
        id: this.genId(),
        scope,
        detail: scope.describe(args),
        resolve,
      }
      this.state = { pending: [...this.state.pending, req] }
      this.notify()
    })
  }

  allow(id: string): void { this.settle(id, true) }
  deny(id: string): void { this.settle(id, false) }

  private settle(id: string, allowed: boolean): void {
    const req = this.state.pending.find((r) => r.id === id)
    if (!req) return
    this.state = { pending: this.state.pending.filter((r) => r.id !== id) }
    this.notify()
    req.resolve(allowed)
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- permissionBroker`
Expected: PASS, 2 tests.

- [ ] **CHECKPOINT** — Summarize, user commits. Suggested: `feat(core): add default-deny permission broker`.

---

### Task 4: Memory Store

**Files:**
- Create: `src/core/memoryStore.ts`
- Test: `src/core/memoryStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/memoryStore.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStore } from './memoryStore'

let counter = 0
const genId = () => `m-${++counter}`

describe('MemoryStore', () => {
  beforeEach(() => { localStorage.clear(); counter = 0 })

  it('adds, lists, and persists entries to localStorage', () => {
    const store = new MemoryStore('test-memory', genId, () => 100)
    store.add('User prefers concise intros')
    expect(store.getState().entries).toHaveLength(1)
    expect(store.getState().entries[0]).toMatchObject({ id: 'm-1', text: 'User prefers concise intros', createdAt: 100 })
    const reloaded = new MemoryStore('test-memory', genId, () => 200)
    expect(reloaded.getState().entries).toHaveLength(1)
  })

  it('removes entries', () => {
    const store = new MemoryStore('test-memory', genId, () => 100)
    store.add('fact a')
    store.add('fact b')
    store.remove('m-1')
    expect(store.getState().entries.map((e) => e.text)).toEqual(['fact b'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- memoryStore`
Expected: FAIL — cannot find module './memoryStore'.

- [ ] **Step 3: Implement**

Create `src/core/memoryStore.ts`:
```ts
import { Emitter } from './emitter'
import type { MemoryEntry } from './types'

interface MemoryState { entries: MemoryEntry[] }

export class MemoryStore extends Emitter<MemoryState> {
  private state: MemoryState

  constructor(
    private storageKey: string,
    private genId: () => string,
    private now: () => number = () => Date.now(),
  ) {
    super()
    this.state = { entries: this.load() }
  }

  getState = (): MemoryState => this.state

  add(text: string): void {
    const entry: MemoryEntry = { id: this.genId(), text, createdAt: this.now() }
    this.state = { entries: [...this.state.entries, entry] }
    this.persist()
    this.notify()
  }

  remove(id: string): void {
    this.state = { entries: this.state.entries.filter((e) => e.id !== id) }
    this.persist()
    this.notify()
  }

  private load(): MemoryEntry[] {
    try {
      const raw = localStorage.getItem(this.storageKey)
      return raw ? (JSON.parse(raw) as MemoryEntry[]) : []
    } catch { return [] }
  }

  private persist(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state.entries))
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- memoryStore`
Expected: PASS, 2 tests.

- [ ] **CHECKPOINT** — Summarize, user commits. Suggested: `feat(core): add localStorage-backed memory store`.

---

### Task 5: llama.cpp streaming client

**Files:**
- Create: `src/core/llamaClient.ts`
- Test: `src/core/llamaClient.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/llamaClient.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { LlamaClient } from './llamaClient'

function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(`data: ${c}\n\n`))
      controller.enqueue(enc.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
}

describe('LlamaClient', () => {
  it('assembles streamed content and fires onToken', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(sseStream([
        JSON.stringify({ choices: [{ delta: { content: 'He' } }] }),
        JSON.stringify({ choices: [{ delta: { content: 'llo' } }] }),
      ]), { status: 200 }),
    )
    const client = new LlamaClient('http://localhost:8080/v1', 'local', fetchMock as any)
    const tokens: string[] = []
    const res = await client.chat([{ role: 'user', content: 'hi' }], [], (t) => tokens.push(t))
    expect(res.content).toBe('Hello')
    expect(tokens).toEqual(['He', 'llo'])
    expect(res.toolCalls).toEqual([])
  })

  it('assembles streamed tool calls across deltas', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(sseStream([
        JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'read_document', arguments: '' } }] } }] }),
        JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{}' } }] } }] }),
        JSON.stringify({ choices: [{ finish_reason: 'tool_calls', delta: {} }] }),
      ]), { status: 200 }),
    )
    const client = new LlamaClient('http://localhost:8080/v1', 'local', fetchMock as any)
    const res = await client.chat([{ role: 'user', content: 'help' }], [], () => {})
    expect(res.toolCalls).toEqual([{ id: 'call_1', name: 'read_document', arguments: '{}' }])
  })

  it('throws a clear error when the server is unreachable', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    const client = new LlamaClient('http://localhost:8080/v1', 'local', fetchMock as any)
    await expect(client.chat([{ role: 'user', content: 'hi' }], [], () => {}))
      .rejects.toThrow(/Local model not reachable/)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- llamaClient`
Expected: FAIL — cannot find module './llamaClient'.

- [ ] **Step 3: Implement**

Create `src/core/llamaClient.ts`:
```ts
import type { ChatMessage, ToolCall, ToolDef } from './types'

export interface ChatResult { content: string; toolCalls: ToolCall[] }

interface ToolCallAccum { id: string; name: string; arguments: string }

export class LlamaClient {
  constructor(
    private baseUrl: string,
    private model: string,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  toOpenAITools(tools: ToolDef[]) {
    return tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }))
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDef[],
    onToken: (t: string) => void,
  ): Promise<ChatResult> {
    let res: Response
    try {
      res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          stream: true,
          messages: messages.map(this.toWireMessage),
          ...(tools.length ? { tools: this.toOpenAITools(tools) } : {}),
        }),
      })
    } catch (e) {
      throw new Error('Local model not reachable. Is llama-server running on localhost?')
    }
    if (!res.ok || !res.body) {
      throw new Error(`Local model error (HTTP ${res.status}).`)
    }
    return this.readStream(res.body, onToken)
  }

  private toWireMessage = (m: ChatMessage) => {
    if (m.role === 'tool') {
      return { role: 'tool', tool_call_id: m.toolCallId, content: m.content }
    }
    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'assistant',
        content: m.content,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id, type: 'function', function: { name: tc.name, arguments: tc.arguments },
        })),
      }
    }
    return { role: m.role, content: m.content }
  }

  private async readStream(
    body: ReadableStream<Uint8Array>,
    onToken: (t: string) => void,
  ): Promise<ChatResult> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let content = ''
    const toolCalls = new Map<number, ToolCallAccum>()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue
        let parsed: any
        try { parsed = JSON.parse(data) } catch { continue }
        const delta = parsed?.choices?.[0]?.delta
        if (!delta) continue
        if (typeof delta.content === 'string') {
          content += delta.content
          onToken(delta.content)
        }
        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0
            const acc = toolCalls.get(idx) ?? { id: '', name: '', arguments: '' }
            if (tc.id) acc.id = tc.id
            if (tc.function?.name) acc.name = tc.function.name
            if (tc.function?.arguments) acc.arguments += tc.function.arguments
            toolCalls.set(idx, acc)
          }
        }
      }
    }
    return {
      content,
      toolCalls: [...toolCalls.values()].map((a) => ({ id: a.id, name: a.name, arguments: a.arguments })),
    }
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- llamaClient`
Expected: PASS, 3 tests.

- [ ] **CHECKPOINT** — Summarize, user commits. Suggested: `feat(core): add streaming llama.cpp client`.

---

### Task 6: Registry and Agent Engine

**Files:**
- Create: `src/core/registry.ts`
- Create: `src/core/agentEngine.ts`
- Test: `src/core/registry.test.ts`
- Test: `src/core/agentEngine.test.ts`

- [ ] **Step 1: Write the failing Registry test**

Create `src/core/registry.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { Registry } from './registry'
import type { ToolDef } from './types'

const tool: ToolDef = {
  name: 'read_document', description: 'read', parameters: { type: 'object', properties: {} },
  handler: () => 'doc text',
}

describe('Registry', () => {
  it('registers and looks up tools by name', () => {
    const r = new Registry()
    r.register([tool])
    expect(r.get('read_document')).toBe(tool)
    expect(r.all()).toHaveLength(1)
    expect(r.get('missing')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- registry`
Expected: FAIL — cannot find module './registry'.

- [ ] **Step 3: Implement Registry**

Create `src/core/registry.ts`:
```ts
import type { ToolDef } from './types'

export class Registry {
  private tools = new Map<string, ToolDef>()
  register(tools: ToolDef[]): void {
    for (const t of tools) this.tools.set(t.name, t)
  }
  get(name: string): ToolDef | undefined { return this.tools.get(name) }
  all(): ToolDef[] { return [...this.tools.values()] }
}
```

- [ ] **Step 4: Run to verify Registry passes**

Run: `npm test -- registry`
Expected: PASS.

- [ ] **Step 5: Write the failing Agent Engine test**

Create `src/core/agentEngine.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { AgentEngine } from './agentEngine'
import { Registry } from './registry'
import { PermissionBroker } from './permissionBroker'
import type { ChatResult } from './llamaClient'
import type { ToolDef } from './types'

// A fake LlamaClient that returns scripted results per call.
function fakeClient(scripts: ChatResult[]) {
  let i = 0
  return {
    chat: vi.fn(async (_m: any, _t: any, onToken: (s: string) => void): Promise<ChatResult> => {
      const r = scripts[i++]
      if (r.content) onToken(r.content)
      return r
    }),
  } as any
}

const readTool: ToolDef = {
  name: 'read_document', description: 'read the doc',
  parameters: { type: 'object', properties: {} },
  permission: { kind: 'read', resource: 'document:Untitled.md', locality: 'LOCAL', describe: () => 'Read Untitled.md?' },
  handler: () => 'INTRO PARAGRAPH',
}

describe('AgentEngine', () => {
  it('runs a tool call only after permission is granted, then returns the final answer', async () => {
    const registry = new Registry(); registry.register([readTool])
    let n = 0
    const broker = new PermissionBroker(() => `p-${++n}`)
    const client = fakeClient([
      { content: '', toolCalls: [{ id: 'c1', name: 'read_document', arguments: '{}' }] },
      { content: 'Here is a tighter intro.', toolCalls: [] },
    ])
    const engine = new AgentEngine(client, registry, broker)

    const runPromise = engine.run('tighten my intro')
    // Permission prompt should appear; grant it.
    await vi.waitFor(() => expect(broker.getState().pending).toHaveLength(1))
    broker.allow(broker.getState().pending[0].id)

    const answer = await runPromise
    expect(answer).toBe('Here is a tighter intro.')
    // tool result must have been fed back as a 'tool' message
    const toolMsg = engine.getState().messages.find((m) => m.role === 'tool')
    expect(toolMsg?.content).toContain('INTRO PARAGRAPH')
    expect(engine.getState().busy).toBe(false)
  })

  it('feeds back a denial and does not execute the handler when permission is denied', async () => {
    const handler = vi.fn(() => 'SECRET')
    const registry = new Registry()
    registry.register([{ ...readTool, handler }])
    let n = 0
    const broker = new PermissionBroker(() => `p-${++n}`)
    const client = fakeClient([
      { content: '', toolCalls: [{ id: 'c1', name: 'read_document', arguments: '{}' }] },
      { content: 'Okay, I will not read it.', toolCalls: [] },
    ])
    const engine = new AgentEngine(client, registry, broker)

    const runPromise = engine.run('tighten my intro')
    await vi.waitFor(() => expect(broker.getState().pending).toHaveLength(1))
    broker.deny(broker.getState().pending[0].id)

    await runPromise
    expect(handler).not.toHaveBeenCalled()
    const toolMsg = engine.getState().messages.find((m) => m.role === 'tool')
    expect(toolMsg?.content).toMatch(/denied/i)
  })
})
```

- [ ] **Step 6: Run to verify it fails**

Run: `npm test -- agentEngine`
Expected: FAIL — cannot find module './agentEngine'.

- [ ] **Step 7: Implement Agent Engine**

Create `src/core/agentEngine.ts`:
```ts
import { Emitter } from './emitter'
import type { LlamaClient } from './llamaClient'
import type { Registry } from './registry'
import type { PermissionBroker } from './permissionBroker'
import type { ChatMessage, ToolCall } from './types'

interface AgentState { messages: ChatMessage[]; streaming: string; busy: boolean }
const MAX_ITERS = 5

export class AgentEngine extends Emitter<AgentState> {
  private state: AgentState = { messages: [], streaming: '', busy: false }

  constructor(
    private client: Pick<LlamaClient, 'chat'>,
    private registry: Registry,
    private broker: PermissionBroker,
  ) { super() }

  getState = (): AgentState => this.state

  private set(patch: Partial<AgentState>): void {
    this.state = { ...this.state, ...patch }
    this.notify()
  }

  async run(userText: string): Promise<string> {
    const messages: ChatMessage[] = [...this.state.messages, { role: 'user', content: userText }]
    this.set({ messages, busy: true, streaming: '' })

    let final = ''
    for (let iter = 0; iter < MAX_ITERS; iter++) {
      let streamed = ''
      const result = await this.client.chat(this.state.messages, this.registry.all(), (tok) => {
        streamed += tok
        this.set({ streaming: streamed })
      })

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.content,
        toolCalls: result.toolCalls.length ? result.toolCalls : undefined,
      }
      this.set({ messages: [...this.state.messages, assistantMsg], streaming: '' })

      if (!result.toolCalls.length) { final = result.content; break }

      for (const call of result.toolCalls) {
        const toolResult = await this.dispatch(call)
        this.set({
          messages: [...this.state.messages, {
            role: 'tool', toolCallId: call.id, content: toolResult,
          }],
        })
      }
    }

    this.set({ busy: false })
    return final
  }

  private async dispatch(call: ToolCall): Promise<string> {
    const tool = this.registry.get(call.name)
    if (!tool) return JSON.stringify({ error: `Unknown tool: ${call.name}` })

    let args: unknown = {}
    try { args = call.arguments ? JSON.parse(call.arguments) : {} } catch { args = {} }

    if (tool.permission) {
      const allowed = await this.broker.request(tool.permission, args)
      if (!allowed) {
        return JSON.stringify({ denied: true, message: 'User denied permission for this action.' })
      }
    }

    try {
      const out = await tool.handler(args)
      return typeof out === 'string' ? out : JSON.stringify(out)
    } catch (e) {
      return JSON.stringify({ error: (e as Error).message })
    }
  }
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npm test -- agentEngine`
Expected: PASS, 2 tests.

- [ ] **CHECKPOINT** — Summarize, user commits. Suggested: `feat(core): add registry and permission-gated agent loop`.

---

### Task 7: Doc Editor module

**Files:**
- Create: `src/modules/docEditor/docEditorStore.ts`
- Create: `src/modules/docEditor/docEditorModule.tsx`
- Test: `src/modules/docEditor/docEditorStore.test.ts`
- Test: `src/modules/docEditor/docEditorModule.test.tsx`

- [ ] **Step 1: Write the failing store test**

Create `src/modules/docEditor/docEditorStore.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { DocEditorStore } from './docEditorStore'

describe('DocEditorStore', () => {
  it('sets and reads text, and replaces a substring via applyEdit', () => {
    const s = new DocEditorStore('Untitled.md', 'Hello world')
    expect(s.getState().text).toBe('Hello world')
    s.setText('New text')
    expect(s.getState().text).toBe('New text')
    const ok = s.applyEdit('New', 'Fresh')
    expect(ok).toBe(true)
    expect(s.getState().text).toBe('Fresh text')
    expect(s.applyEdit('missing', 'x')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- docEditorStore`
Expected: FAIL — cannot find module './docEditorStore'.

- [ ] **Step 3: Implement the store**

Create `src/modules/docEditor/docEditorStore.ts`:
```ts
import { Emitter } from '../../core/emitter'

interface DocState { name: string; text: string }

export class DocEditorStore extends Emitter<DocState> {
  private state: DocState
  constructor(name: string, initial = '') { super(); this.state = { name, text: initial } }
  getState = (): DocState => this.state
  setText(text: string): void { this.state = { ...this.state, text }; this.notify() }
  applyEdit(find: string, replace: string): boolean {
    if (!this.state.text.includes(find)) return false
    this.setText(this.state.text.replace(find, replace))
    return true
  }
}
```

- [ ] **Step 4: Run to verify the store passes**

Run: `npm test -- docEditorStore`
Expected: PASS.

- [ ] **Step 5: Write the failing module test**

Create `src/modules/docEditor/docEditorModule.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createDocEditorModule } from './docEditorModule'
import { DocEditorStore } from './docEditorStore'

describe('docEditorModule', () => {
  it('exposes read_document and write-gated apply_edit tools', async () => {
    const store = new DocEditorStore('Untitled.md', 'INTRO')
    const mod = createDocEditorModule(store)
    const read = mod.tools.find((t) => t.name === 'read_document')!
    const apply = mod.tools.find((t) => t.name === 'apply_edit')!
    expect(read.permission?.kind).toBe('read')
    expect(apply.permission?.kind).toBe('write')
    await read.handler({})
    expect(await read.handler({})).toBe('INTRO')
    await apply.handler({ find: 'INTRO', replace: 'BETTER INTRO' })
    expect(store.getState().text).toBe('BETTER INTRO')
  })

  it('renders the document text in a textarea', () => {
    const store = new DocEditorStore('Untitled.md', 'hello')
    const mod = createDocEditorModule(store)
    render(mod.render())
    expect(screen.getByRole('textbox')).toHaveValue('hello')
  })
})
```

- [ ] **Step 6: Run to verify it fails**

Run: `npm test -- docEditorModule`
Expected: FAIL — cannot find module './docEditorModule'.

- [ ] **Step 7: Implement the module**

Create `src/modules/docEditor/docEditorModule.tsx`:
```tsx
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { DocEditorStore } from './docEditorStore'

function DocEditorPanel({ store }: { store: DocEditorStore }) {
  const { text } = useStore(store)
  return (
    <textarea
      aria-label="document"
      style={{ width: '100%', height: '100%', border: 'none', resize: 'none', padding: 12, font: 'inherit' }}
      value={text}
      onChange={(e) => store.setText(e.target.value)}
    />
  )
}

export function createDocEditorModule(store: DocEditorStore): WorkspaceModule {
  const resource = `document:${store.getState().name}`
  return {
    id: 'doc-editor',
    title: `Document — ${store.getState().name}`,
    locality: 'LOCAL',
    layoutHints: { defaultSize: 60, collapsible: false, minSize: 30 },
    render: () => <DocEditorPanel store={store} />,
    tools: [
      {
        name: 'read_document',
        description: 'Read the full text of the current document.',
        parameters: { type: 'object', properties: {} },
        permission: { kind: 'read', resource, locality: 'LOCAL', describe: () => `Read ${store.getState().name}?` },
        handler: () => store.getState().text,
      },
      {
        name: 'apply_edit',
        description: 'Replace the first occurrence of `find` with `replace` in the document.',
        parameters: {
          type: 'object',
          properties: { find: { type: 'string' }, replace: { type: 'string' } },
          required: ['find', 'replace'],
        },
        permission: { kind: 'write', resource, locality: 'LOCAL', describe: (a: any) => `Edit ${store.getState().name} (replace "${a?.find ?? ''}")?` },
        handler: (a: { find: string; replace: string }) => ({ applied: store.applyEdit(a.find, a.replace) }),
      },
    ],
  }
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npm test -- docEditor`
Expected: PASS (store + module tests).

- [ ] **CHECKPOINT** — Summarize, user commits. Suggested: `feat(modules): add doc editor module with read/apply_edit tools`.

---

### Task 8: Memory Viewer module

**Files:**
- Create: `src/modules/memoryViewer/memoryViewerModule.tsx`
- Test: `src/modules/memoryViewer/memoryViewerModule.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/modules/memoryViewer/memoryViewerModule.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryViewerModule } from './memoryViewerModule'
import { MemoryStore } from '../../core/memoryStore'

let c = 0
const genId = () => `m-${++c}`

describe('memoryViewerModule', () => {
  beforeEach(() => { localStorage.clear(); c = 0 })

  it('exposes a remember tool that writes to the store (LOCAL, no permission gate)', async () => {
    const store = new MemoryStore('mem', genId, () => 1)
    const mod = createMemoryViewerModule(store)
    const remember = mod.tools.find((t) => t.name === 'remember')!
    expect(remember.permission).toBeUndefined()
    await remember.handler({ fact: 'User prefers concise intros' })
    expect(store.getState().entries[0].text).toBe('User prefers concise intros')
  })

  it('renders saved memories', () => {
    const store = new MemoryStore('mem', genId, () => 1)
    store.add('User prefers concise intros')
    const mod = createMemoryViewerModule(store)
    render(mod.render())
    expect(screen.getByText('User prefers concise intros')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- memoryViewerModule`
Expected: FAIL — cannot find module './memoryViewerModule'.

- [ ] **Step 3: Implement**

Create `src/modules/memoryViewer/memoryViewerModule.tsx`:
```tsx
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { MemoryStore } from '../../core/memoryStore'

function MemoryPanel({ store }: { store: MemoryStore }) {
  const { entries } = useStore(store)
  return (
    <div style={{ padding: 10, overflowY: 'auto', height: '100%' }}>
      {entries.length === 0 && <p style={{ color: '#888', fontSize: 12 }}>Nothing learned yet.</p>}
      {entries.map((e) => (
        <div key={e.id} style={{ display: 'flex', gap: 8, alignItems: 'start', marginBottom: 6, fontSize: 12 }}>
          <span style={{ flex: 1 }}>{e.text}</span>
          <button aria-label={`forget ${e.id}`} onClick={() => store.remove(e.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}

export function createMemoryViewerModule(store: MemoryStore): WorkspaceModule {
  return {
    id: 'memory-viewer',
    title: 'Memory',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 30, collapsible: true, minSize: 15 },
    render: () => <MemoryPanel store={store} />,
    tools: [
      {
        name: 'remember',
        description: 'Save a concise, durable fact about the user that will help future collaboration.',
        parameters: {
          type: 'object',
          properties: { fact: { type: 'string' } },
          required: ['fact'],
        },
        // LOCAL, auto-saved (no network); always user-inspectable and deletable in this panel.
        handler: (a: { fact: string }) => { store.add(a.fact); return { saved: true } },
      },
    ],
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- memoryViewerModule`
Expected: PASS, 2 tests.

- [ ] **CHECKPOINT** — Summarize, user commits. Suggested: `feat(modules): add memory viewer module with remember tool`.

---

### Task 9: Permission Prompt module

**Files:**
- Create: `src/modules/permissionPrompt/permissionPromptModule.tsx`
- Test: `src/modules/permissionPrompt/permissionPromptModule.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/modules/permissionPrompt/permissionPromptModule.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createPermissionPromptModule } from './permissionPromptModule'
import { PermissionBroker } from '../../core/permissionBroker'

const scope = { kind: 'read' as const, resource: 'document:Untitled.md', locality: 'LOCAL' as const, describe: () => 'Read Untitled.md?' }

describe('permissionPromptModule', () => {
  it('renders pending requests and resolves them via Allow', async () => {
    let n = 0
    const broker = new PermissionBroker(() => `p-${++n}`)
    const mod = createPermissionPromptModule(broker)
    render(mod.render())
    const promise = broker.request(scope, {})
    expect(await screen.findByText('Read Untitled.md?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /allow/i }))
    await expect(promise).resolves.toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- permissionPromptModule`
Expected: FAIL — cannot find module './permissionPromptModule'.

- [ ] **Step 3: Implement**

Create `src/modules/permissionPrompt/permissionPromptModule.tsx`:
```tsx
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { PermissionBroker } from '../../core/permissionBroker'

function PermissionPanel({ broker }: { broker: PermissionBroker }) {
  const { pending } = useStore(broker)
  if (pending.length === 0) {
    return <div style={{ padding: 8, fontSize: 11, color: '#999' }}>No pending requests.</div>
  }
  return (
    <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {pending.map((req) => (
        <div key={req.id} style={{ background: '#fff7e6', border: '1px solid #ffe2a8', borderRadius: 6, padding: 8, fontSize: 12 }}>
          <div style={{ marginBottom: 6 }}>
            <strong>{req.scope.locality}</strong> · {req.detail}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => broker.allow(req.id)}>Allow</button>
            <button onClick={() => broker.deny(req.id)}>Deny</button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function createPermissionPromptModule(broker: PermissionBroker): WorkspaceModule {
  return {
    id: 'permission-prompt',
    title: 'Permissions',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 20, collapsible: true, minSize: 10 },
    render: () => <PermissionPanel broker={broker} />,
    tools: [],
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- permissionPromptModule`
Expected: PASS.

- [ ] **CHECKPOINT** — Summarize, user commits. Suggested: `feat(modules): add permission prompt module`.

---

### Task 10: AI Chat module

**Files:**
- Create: `src/modules/aiChat/aiChatModule.tsx`
- Test: `src/modules/aiChat/aiChatModule.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/modules/aiChat/aiChatModule.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createAiChatModule } from './aiChatModule'
import { AgentEngine } from '../../core/agentEngine'
import { Registry } from '../../core/registry'
import { PermissionBroker } from '../../core/permissionBroker'

function fakeClient() {
  return { chat: vi.fn(async (_m: any, _t: any, onToken: (s: string) => void) => { onToken('Hi there'); return { content: 'Hi there', toolCalls: [] } }) } as any
}

describe('aiChatModule', () => {
  it('sends user input to the engine and shows the assistant reply', async () => {
    const engine = new AgentEngine(fakeClient(), new Registry(), new PermissionBroker(() => 'p'))
    const mod = createAiChatModule(engine)
    render(mod.render())
    await userEvent.type(screen.getByРlaceholderText(/ask/i), 'help me')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(await screen.findByText('help me')).toBeInTheDocument()
    expect(await screen.findByText('Hi there')).toBeInTheDocument()
  })
})
```
> Note: fix the typo `getByРlaceholderText` → `getByPlaceholderText` (a stray Cyrillic char) when typing it out — use `screen.getByPlaceholderText(/ask/i)`.

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- aiChatModule`
Expected: FAIL — cannot find module './aiChatModule'.

- [ ] **Step 3: Implement**

Create `src/modules/aiChat/aiChatModule.tsx`:
```tsx
import { useState } from 'react'
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { AgentEngine } from '../../core/agentEngine'

function ChatPanel({ engine }: { engine: AgentEngine }) {
  const { messages, streaming, busy } = useStore(engine)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    setInput(''); setError(null)
    try { await engine.run(text) } catch (e) { setError((e as Error).message) }
  }

  const visible = messages.filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? '#5b6cff' : '#f0f1f6', color: m.role === 'user' ? '#fff' : '#222', borderRadius: 8, padding: '6px 9px', fontSize: 12, maxWidth: '85%' }}>
            {m.content}
          </div>
        ))}
        {busy && streaming && (
          <div style={{ alignSelf: 'flex-start', background: '#f0f1f6', borderRadius: 8, padding: '6px 9px', fontSize: 12, opacity: 0.8 }}>{streaming}</div>
        )}
        {error && <div style={{ color: '#b00', fontSize: 11 }}>{error}</div>}
      </div>
      <div style={{ display: 'flex', gap: 6, padding: 8, borderTop: '1px solid #eee' }}>
        <input
          style={{ flex: 1 }}
          placeholder="Ask for writing help…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
        />
        <button onClick={send} disabled={busy}>Send</button>
      </div>
    </div>
  )
}

export function createAiChatModule(engine: AgentEngine): WorkspaceModule {
  return {
    id: 'ai-chat',
    title: 'AI Chat — writing ideas',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 55, collapsible: true, minSize: 20 },
    render: () => <ChatPanel engine={engine} />,
    tools: [],
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- aiChatModule`
Expected: PASS.

- [ ] **CHECKPOINT** — Summarize, user commits. Suggested: `feat(modules): add AI chat module wired to agent engine`.

---

### Task 11: Notes feature manifest + shell rendering

**Files:**
- Create: `src/features/notes.ts`
- Create: `src/shell/PanelArea.tsx`
- Create: `src/shell/FeatureRail.tsx`
- Create: `src/shell/WorkspaceShell.tsx`
- Test: `src/shell/PanelArea.test.tsx`

- [ ] **Step 1: Write the failing PanelArea test**

Create `src/shell/PanelArea.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PanelArea } from './PanelArea'
import type { FeatureManifest, WorkspaceModule } from '../core/types'

function stubModule(id: string, label: string): WorkspaceModule {
  return { id, title: label, locality: 'LOCAL', tools: [], render: () => <div>{label}</div> }
}

const manifest: FeatureManifest = {
  id: 'notes', name: 'Notes', icon: '📝',
  modules: [stubModule('a', 'Panel A'), stubModule('b', 'Panel B')],
  layout: { type: 'split', direction: 'horizontal', children: [
    { type: 'panel', moduleId: 'a' }, { type: 'panel', moduleId: 'b' },
  ] },
}

describe('PanelArea', () => {
  it('renders each module referenced by the layout', () => {
    render(<PanelArea manifest={manifest} />)
    expect(screen.getByText('Panel A')).toBeInTheDocument()
    expect(screen.getByText('Panel B')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- PanelArea`
Expected: FAIL — cannot find module './PanelArea'.

- [ ] **Step 3: Implement PanelArea**

Create `src/shell/PanelArea.tsx`:
```tsx
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import type { FeatureManifest, LayoutNode, WorkspaceModule } from '../core/types'

function PanelFrame({ module }: { module: WorkspaceModule }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', border: '1px solid #e0e0e8', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '6px 10px', borderBottom: '1px solid #eee', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, background: '#fafafe' }}>
        <span>{module.title}</span>
        <span style={{ marginLeft: 'auto', fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: module.locality === 'LOCAL' ? '#e4f6ea' : '#fdeede', color: module.locality === 'LOCAL' ? '#2c7a47' : '#a8631a' }}>
          {module.locality}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{module.render()}</div>
    </div>
  )
}

function renderNode(node: LayoutNode, modules: Map<string, WorkspaceModule>, key: string): JSX.Element {
  if (node.type === 'panel') {
    const mod = modules.get(node.moduleId)
    if (!mod) return <Panel key={key}><div>Unknown module: {node.moduleId}</div></Panel>
    return (
      <Panel key={key} defaultSize={node.size ?? mod.layoutHints?.defaultSize} minSize={mod.layoutHints?.minSize} collapsible={node.collapsible ?? mod.layoutHints?.collapsible}>
        <div style={{ height: '100%', padding: 4 }}><PanelFrame module={mod} /></div>
      </Panel>
    )
  }
  return (
    <Panel key={key} defaultSize={node.size}>
      <PanelGroup direction={node.direction}>
        {node.children.map((child, i) => (
          <FragmentWithHandle key={`${key}-${i}`} isFirst={i === 0} direction={node.direction}>
            {renderNode(child, modules, `${key}-${i}`)}
          </FragmentWithHandle>
        ))}
      </PanelGroup>
    </Panel>
  )
}

function FragmentWithHandle({ children, isFirst, direction }: { children: JSX.Element; isFirst: boolean; direction: 'horizontal' | 'vertical' }) {
  return (
    <>
      {!isFirst && <PanelResizeHandle style={{ [direction === 'horizontal' ? 'width' : 'height']: 6 } as any} />}
      {children}
    </>
  )
}

export function PanelArea({ manifest }: { manifest: FeatureManifest }) {
  const modules = new Map(manifest.modules.map((m) => [m.id, m]))
  const root = manifest.layout
  return (
    <div style={{ height: '100%', background: '#eef0f5' }}>
      {root.type === 'panel' ? (
        <div style={{ height: '100%', padding: 4 }}>
          <PanelFrame module={modules.get(root.moduleId)!} />
        </div>
      ) : (
        <PanelGroup direction={root.direction}>
          {root.children.map((child, i) => (
            <FragmentWithHandle key={i} isFirst={i === 0} direction={root.direction}>
              {renderNode(child, modules, `${i}`)}
            </FragmentWithHandle>
          ))}
        </PanelGroup>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify PanelArea passes**

Run: `npm test -- PanelArea`
Expected: PASS.

- [ ] **Step 5: Implement FeatureRail (no test — trivial presentational)**

Create `src/shell/FeatureRail.tsx`:
```tsx
import type { FeatureManifest } from '../core/types'

export function FeatureRail({ features, activeId, onSelect }: {
  features: FeatureManifest[]; activeId: string; onSelect: (id: string) => void
}) {
  return (
    <div style={{ width: 54, background: '#1b1f2b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0' }}>
      {features.map((f) => (
        <button
          key={f.id}
          title={f.name}
          onClick={() => onSelect(f.id)}
          style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 15, background: f.id === activeId ? '#5b6cff' : '#2a3042', color: f.id === activeId ? '#fff' : '#aab1c5' }}
        >
          {f.icon}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Implement WorkspaceShell (no test — composition)**

Create `src/shell/WorkspaceShell.tsx`:
```tsx
import { useState } from 'react'
import type { FeatureManifest } from '../core/types'
import { FeatureRail } from './FeatureRail'
import { PanelArea } from './PanelArea'

export function WorkspaceShell({ features }: { features: FeatureManifest[] }) {
  const [activeId, setActiveId] = useState(features[0].id)
  const active = features.find((f) => f.id === activeId) ?? features[0]
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <FeatureRail features={features} activeId={activeId} onSelect={setActiveId} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <PanelArea manifest={active} />
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Implement Notes feature manifest (no test — wiring; covered by integration test in Task 12)**

Create `src/features/notes.ts`:
```ts
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
          { type: 'panel', moduleId: 'ai-chat' },
          { type: 'panel', moduleId: 'permission-prompt' },
          { type: 'panel', moduleId: 'memory-viewer' },
        ] },
        { type: 'panel', moduleId: 'doc-editor', size: 66 },
      ],
    },
  }
}
```

- [ ] **Step 8: Run all tests**

Run: `npm test`
Expected: PASS (all prior suites still green).

- [ ] **CHECKPOINT** — Summarize, user commits. Suggested: `feat(shell): add tiled panel area, rail, and notes manifest`.

---

### Task 12: App wiring + end-to-end slice integration test

**Files:**
- Create: `src/app/services.ts`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Test: `src/app/slice.integration.test.tsx`

- [ ] **Step 1: Implement service construction**

Create `src/app/services.ts`:
```ts
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
  'You can read and edit the user\'s document and remember durable facts, but every read/write ' +
  'requires explicit user permission via tools. Prefer reading the document before editing. ' +
  'When you learn a durable preference about the user, call the remember tool.'

export interface AppServices {
  features: FeatureManifest[]
  broker: PermissionBroker
  memory: MemoryStore
  engine: AgentEngine
  docStore: DocEditorStore
}

export function createServices(opts?: { client?: { chat: AgentEngine['run'] extends never ? never : any } }): AppServices {
  const broker = new PermissionBroker(genId)
  const memory = new MemoryStore('workspace-memory', genId)
  const docStore = new DocEditorStore('Untitled.md', '')
  const registry = new Registry()

  const baseUrl = import.meta.env?.VITE_LLAMA_URL ?? 'http://localhost:8080/v1'
  const model = import.meta.env?.VITE_LLAMA_MODEL ?? 'local'
  const client = opts?.client ?? new LlamaClient(baseUrl, model)

  const engine = new AgentEngine(client as any, registry, broker)
  // seed the system prompt
  ;(engine.getState().messages as any).push({ role: 'system', content: SYSTEM_PROMPT })

  const notes = createNotesFeature({ docStore, engine, broker, memory })
  // collect tools from all modules in all features
  for (const feature of [notes]) {
    for (const mod of feature.modules) registry.register(mod.tools)
  }

  return { features: [notes], broker, memory, engine, docStore }
}
```
> Implementation note: instead of mutating `engine.getState().messages` directly, add a public `seedSystem(prompt: string)` method to `AgentEngine` that sets `this.state = { ...this.state, messages: [{ role: 'system', content: prompt }] }` and call it here. (Add this method now — it keeps state encapsulated. Update the call site to `engine.seedSystem(SYSTEM_PROMPT)`.)

- [ ] **Step 2: Add `seedSystem` to AgentEngine**

In `src/core/agentEngine.ts`, add this public method to the class:
```ts
  seedSystem(prompt: string): void {
    this.set({ messages: [{ role: 'system', content: prompt }, ...this.state.messages.filter((m) => m.role !== 'system')] })
  }
```
Then in `services.ts` replace the `;(engine.getState()...push(...)` line with: `engine.seedSystem(SYSTEM_PROMPT)`.

- [ ] **Step 3: Wire App.tsx**

Replace `src/App.tsx` contents:
```tsx
import { useMemo } from 'react'
import { createServices } from './app/services'
import { WorkspaceShell } from './shell/WorkspaceShell'

export default function App() {
  const services = useMemo(() => createServices(), [])
  return <WorkspaceShell features={services.features} />
}
```

- [ ] **Step 4: Ensure main.tsx renders App**

Confirm `src/main.tsx` renders `<App />` (Vite's default does). Remove the default Vite CSS import if it interferes; otherwise leave as-is.

- [ ] **Step 5: Write the end-to-end slice integration test**

Create `src/app/slice.integration.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createServices } from './services'
import { WorkspaceShell } from '../shell/WorkspaceShell'
import type { ChatResult } from '../core/llamaClient'

// Scripted model: 1) read the doc, 2) edit it, 3) remember a preference, 4) final answer.
function scriptedClient(scripts: ChatResult[]) {
  let i = 0
  return { chat: vi.fn(async (_m: any, _t: any, onToken: (s: string) => void): Promise<ChatResult> => {
    const r = scripts[i++] ?? { content: '', toolCalls: [] }
    if (r.content) onToken(r.content)
    return r
  }) }
}

describe('Notes slice — canonical scenario', () => {
  beforeEach(() => localStorage.clear())

  it('reads, edits (with permission), and remembers — all gated by the user', async () => {
    const client = scriptedClient([
      { content: '', toolCalls: [{ id: 'c1', name: 'read_document', arguments: '{}' }] },
      { content: '', toolCalls: [{ id: 'c2', name: 'apply_edit', arguments: JSON.stringify({ find: 'draft intro', replace: 'A crisp, direct intro.' }) }] },
      { content: '', toolCalls: [{ id: 'c3', name: 'remember', arguments: JSON.stringify({ fact: 'User prefers crisp, direct intros.' }) }] },
      { content: 'Done — I tightened your intro.', toolCalls: [] },
    ])
    const services = createServices({ client })
    services.docStore.setText('draft intro')

    render(<WorkspaceShell features={services.features} />)

    await userEvent.type(screen.getByPlaceholderText(/ask/i), 'tighten my intro')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))

    // 1) read permission prompt → allow
    const allow1 = await screen.findByRole('button', { name: /allow/i })
    await userEvent.click(allow1)

    // 2) write permission prompt → allow
    const allow2 = await screen.findByRole('button', { name: /allow/i })
    await userEvent.click(allow2)

    // remember is not gated; final answer shows
    expect(await screen.findByText('Done — I tightened your intro.')).toBeInTheDocument()
    // document was edited
    expect(screen.getByLabelText('document')).toHaveValue('A crisp, direct intro.')
    // memory recorded the learning
    expect(screen.getByText('User prefers crisp, direct intros.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run the integration test**

Run: `npm test -- slice.integration`
Expected: PASS — read gated, edit gated, edit applied, memory written, final answer shown.

- [ ] **Step 7: Run the full suite + typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: all suites PASS, no type errors.

- [ ] **CHECKPOINT** — Summarize, user commits. Suggested: `feat(app): wire services and add end-to-end notes slice test`.

---

### Task 13: Manual verification against real llama-server

**Files:** none (manual)

- [ ] **Step 1: Start llama-server with tool support**

Run (separate terminal; assumes a downloaded GGUF and `llama.cpp` built):
```bash
llama-server -m /path/to/model.gguf --jinja -c 8192 --port 8080
```
`--jinja` enables the chat template needed for OpenAI-style tool calling.

- [ ] **Step 2: Point the app at the server (optional override)**

If the server is not on the default `http://localhost:8080/v1`, create `.env.local`:
```
VITE_LLAMA_URL=http://localhost:8080/v1
VITE_LLAMA_MODEL=local
```

- [ ] **Step 3: Run the dev server**

Run: `npm run dev`
Open the printed localhost URL.

- [ ] **Step 4: Walk the canonical scenario manually**

1. Type some text in the Document panel (right).
2. In AI Chat (left), ask: "Please tighten my intro paragraph."
3. Confirm a **Read** permission prompt appears; click **Allow**.
4. Confirm the agent proposes/asks to edit; on the **Write** prompt click **Allow**; verify the document text changes.
5. Confirm a learned note appears in the Memory panel; verify the **✕** button removes it.
6. Confirm every panel shows the correct **LOCAL** badge.

- [ ] **Step 5: Verify the privacy/error path**

Stop llama-server, send a chat message, and confirm the AI Chat shows "Local model not reachable…" rather than hanging, while the rest of the workspace still works.

- [ ] **CHECKPOINT (final)** — Summarize the whole slice for the user (what works, how it was verified) and let them commit. Suggested: `docs: note manual verification of notes slice`.

---

## Self-Review

**Spec coverage check (against `2026-06-05-local-ai-workspace-design.md`):**
- Workspace Shell (rail + tiled area) → Task 11.
- Features declarative (manifest) → Task 11 (`createNotesFeature`).
- Module Library + module contract (UI + tools + permissions + layout hints) → `WorkspaceModule` in Task 2; modules in Tasks 7–10.
- Agent Engine (loop, tool registry, streaming) → Tasks 5, 6.
- Permission/Privacy Broker (single chokepoint, default-deny, LOCAL/NETWORK) → Task 3; enforced in Task 6 `dispatch`; surfaced in Task 9.
- Memory Store (inspectable, editable, persisted) → Task 4; UI Task 8.
- Local Infrastructure (llama-server localhost) → Task 5 client; Task 13 manual run.
- Canonical scenario (read→permit→read→permit→edit→remember) → Task 12 integration test; Task 13 manual.
- Error handling (server unreachable, malformed args, denial) → Task 5 (unreachable), Task 6 (`JSON.parse` guard + denial feedback), Task 10 (error display).
- Privacy UX (per-panel LOCAL/NETWORK badge) → Task 11 `PanelFrame`.
- Testing approach (module contracts, broker no-bypass, engine vs mock, memory round-trip, slice integration) → Tasks 3–12.
- Deferred (AI Search/NETWORK, extra features, Tauri) → explicitly out of scope; not in any task. ✔

**Type consistency:** `WorkspaceModule`, `FeatureManifest`, `LayoutNode`, `ToolDef`, `PermissionScope`, `ChatMessage`, `MemoryEntry` defined once in Task 2 and used unchanged throughout. `AgentEngine.run`, `.getState`, `.seedSystem`; `PermissionBroker.request/allow/deny`; `DocEditorStore.applyEdit`; `MemoryStore.add/remove`; `Registry.register/get/all` — names consistent across tasks.

**Placeholder scan:** No TBD/TODO. Two intentional notes flag a Cyrillic-character typo to avoid (Task 10) and a state-encapsulation refinement (Task 12 `seedSystem`); both include the exact corrected code.

---

## Notes for the implementer
- DRY: every store extends `Emitter`; every panel uses `useStore`. Don't reinvent subscriptions.
- YAGNI: no AI Search, no multi-doc, no Tauri in this slice — they're deferred by design.
- TDD: write the test, watch it fail, implement, watch it pass, then hit the CHECKPOINT.
- The user runs all git. Stop at each CHECKPOINT and summarize; never run git yourself.
