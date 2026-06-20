# Task 4: OpenDocsStore (tabbed open files)

Part of "Composable Views (v1)", Phase 2. Generalizes the connectors viewer's single open file into a
multi-file model so the viewer can show tabs. Reuses `DocEditorStore` + `ConnectorsSaveStore` per tab.

## Global Constraints (bind every task)
- tsconfig `erasableSyntaxOnly: true` → NO TS constructor parameter properties. Declare explicit class fields, assign in the body.
- Stores extend `Emitter<TState>` (`src/core/emitter.ts`): private `state`, `getState = (): T => this.state`, replace state + `this.notify()`; `subscribe(listener)` available.
- File I/O only through the MCP bridge via `McpClient` (never raw fetch). Match existing repo style. YAGNI.
- Tests run under Vitest in jsdom.

## Interfaces this task CONSUMES (already exist — read these files to confirm exact APIs)
- `McpClient` — `src/core/mcp/mcpClient.ts`: has `call(name: string, args: unknown): Promise<{ ok: boolean; text: string; error?: string }>`.
- `DocEditorStore` — `src/modules/docEditor/docEditorStore.ts`: `new DocEditorStore(name, initial?)`; `getState(): { name; text; sourcePath? }`; `hydrate({ name, text, sourcePath })`; `setText(text)`; `subscribe(fn)`.
- `ConnectorsSaveStore` — `src/modules/connectors/connectorsSaveStore.ts`: `new ConnectorsSaveStore({ client: McpClient, scratch: DocEditorStore })`; `getState(): { dirty: boolean; status; error? }`; `subscribe(fn)`; `save(): Promise<void>`; tracks dirty vs a baseline of the scratch's text.
- `basename(path: string): string` — exported from `src/modules/connectors/connectorsFs.ts`.

## Interfaces this task PRODUCES
- `interface OpenDoc { path: string; name: string; doc: DocEditorStore; save: ConnectorsSaveStore }`
- `interface OpenDocsState { tabs: { path: string; name: string; dirty: boolean }[]; activePath?: string }`
- `class OpenDocsStore extends Emitter<OpenDocsState>`:
  - `constructor(client: McpClient)`
  - `getState(): OpenDocsState`
  - `activeDoc(): OpenDoc | undefined`
  - `open(path: string): Promise<void>` — if already open, just activate; else MCP `read_file` → new `DocEditorStore` (hydrated with name/text/sourcePath) + `ConnectorsSaveStore`, push, activate. Subscribe doc+save changes to re-sync tab dirty flags.
  - `activate(path: string): void`
  - `close(path: string): void` — remove the tab; if it was active, activate a neighbor (prefer the previous index).

## Files
- Create: `src/modules/connectors/openDocsStore.ts`
- Test: `src/modules/connectors/openDocsStore.test.ts`

## TDD steps

### Step 1: Write the failing test
```ts
// src/modules/connectors/openDocsStore.test.ts
import { describe, it, expect } from 'vitest'
import { OpenDocsStore } from './openDocsStore'
import type { McpClient } from '../../core/mcp/mcpClient'

function fakeClient(files: Record<string, string>): McpClient {
  return {
    listTools: async () => [],
    call: async (name: string, args: unknown) => {
      if (name === 'read_file') return { ok: true, text: files[(args as { path: string }).path] ?? '' }
      return { ok: true, text: '' }
    },
  } as unknown as McpClient
}

describe('OpenDocsStore', () => {
  it('opens a file as a new active tab', async () => {
    const s = new OpenDocsStore(fakeClient({ '/a.md': '# A' }))
    await s.open('/a.md')
    expect(s.getState().tabs.map((t) => t.path)).toEqual(['/a.md'])
    expect(s.getState().activePath).toBe('/a.md')
    expect(s.activeDoc()?.doc.getState().text).toBe('# A')
  })

  it('focuses an already-open file instead of duplicating', async () => {
    const s = new OpenDocsStore(fakeClient({ '/a.md': 'A', '/b.md': 'B' }))
    await s.open('/a.md'); await s.open('/b.md'); await s.open('/a.md')
    expect(s.getState().tabs.length).toBe(2)
    expect(s.getState().activePath).toBe('/a.md')
  })

  it('closes a tab and activates a neighbor', async () => {
    const s = new OpenDocsStore(fakeClient({ '/a.md': 'A', '/b.md': 'B' }))
    await s.open('/a.md'); await s.open('/b.md')
    s.close('/b.md')
    expect(s.getState().tabs.map((t) => t.path)).toEqual(['/a.md'])
    expect(s.getState().activePath).toBe('/a.md')
  })

  it('reflects dirty state of the active doc in its tab', async () => {
    const s = new OpenDocsStore(fakeClient({ '/a.md': 'A' }))
    await s.open('/a.md')
    s.activeDoc()!.doc.setText('A changed')
    expect(s.getState().tabs.find((t) => t.path === '/a.md')?.dirty).toBe(true)
  })
})
```

### Step 2: Run, verify FAIL — `npm test -- openDocsStore` → FAIL.

### Step 3: Implementation
```ts
// src/modules/connectors/openDocsStore.ts
import { Emitter } from '../../core/emitter'
import type { McpClient } from '../../core/mcp/mcpClient'
import { DocEditorStore } from '../docEditor/docEditorStore'
import { ConnectorsSaveStore } from './connectorsSaveStore'
import { basename } from './connectorsFs'

export interface OpenDoc { path: string; name: string; doc: DocEditorStore; save: ConnectorsSaveStore }
export interface OpenDocsState { tabs: { path: string; name: string; dirty: boolean }[]; activePath?: string }

export class OpenDocsStore extends Emitter<OpenDocsState> {
  private state: OpenDocsState = { tabs: [] }
  private docs: OpenDoc[] = []
  private client: McpClient

  constructor(client: McpClient) { super(); this.client = client }

  getState = (): OpenDocsState => this.state
  activeDoc = (): OpenDoc | undefined => this.docs.find((d) => d.path === this.state.activePath)

  async open(path: string): Promise<void> {
    if (this.docs.some((d) => d.path === path)) { this.activate(path); return }
    const r = await this.client.call('read_file', { path })
    if (!r.ok) return
    const name = basename(path)
    const doc = new DocEditorStore(name)
    doc.hydrate({ name, text: r.text, sourcePath: path })
    const save = new ConnectorsSaveStore({ client: this.client, scratch: doc })
    doc.subscribe(() => this.sync())
    save.subscribe(() => this.sync())
    this.docs.push({ path, name, doc, save })
    this.state = { ...this.state, activePath: path }
    this.sync()
  }

  activate(path: string): void {
    if (!this.docs.some((d) => d.path === path)) return
    this.state = { ...this.state, activePath: path }
    this.sync()
  }

  close(path: string): void {
    const i = this.docs.findIndex((d) => d.path === path)
    if (i < 0) return
    this.docs.splice(i, 1)
    let activePath = this.state.activePath
    if (activePath === path) activePath = this.docs[Math.max(0, i - 1)]?.path
    this.state = { ...this.state, activePath }
    this.sync()
  }

  private sync(): void {
    this.state = {
      activePath: this.state.activePath,
      tabs: this.docs.map((d) => ({ path: d.path, name: d.name, dirty: d.save.getState().dirty })),
    }
    this.notify()
  }
}
```

### Step 4: Run, verify PASS — `npm test -- openDocsStore` → PASS.

### Step 5: Typecheck — `npx tsc -b --noEmit` → clean.

## Notes
- The dirty-close confirm dialog lives in the UI (next task), NOT in this store — keep the store free of `window.confirm` so it stays test-friendly.
- If `ConnectorsSaveStore`'s constructor or `DocEditorStore`'s API differs from the assumptions above, read those files and adapt; note any adaptation in your report.

## DO NOT
- Do NOT run any git command. Leave changes uncommitted.
- YAGNI — only the methods listed.
