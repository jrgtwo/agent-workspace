# Task 3: ViewsStore (CRUD + prune-to-registry + persistence)

Part of "Composable Views (v1)". Depends on Tasks 1-2. The `ViewsStore` owns the collection of views
(built-in defaults + user-created), each carrying a `LayoutNode`. The layout tree IS the roster
(`collectModuleIds(layout)` lists its panels) — there is no separate roster field.

## Global Constraints (bind every task)
- tsconfig `erasableSyntaxOnly: true` → NO TS constructor parameter properties (`constructor(private x)`). Declare explicit class fields and assign in the constructor body.
- Stores extend `Emitter<TState>` (`src/core/emitter.ts`): private `state` field, `getState = (): T => this.state`, mutate by replacing `this.state` then `this.notify()`. React binds via `useStore`. `Emitter` provides `subscribe(listener: () => void): () => void` and protected `notify()`.
- IDs: use `crypto.randomUUID()` for new view ids.
- Persistence: `persistState(store, scoped, key, debounceMs?)` hydrates from storage then auto-saves (debounced) on change. Tests use `MemoryBackend`.
- Match existing repo style. YAGNI.

## Interfaces this task CONSUMES (already exist)
- `Emitter` — `src/core/emitter.ts`.
- `LayoutNode` — `src/core/types.ts`.
- `PanelRegistry` — `src/core/panelRegistry.ts` (Task 1): `Map<string, PanelType>`; has `.has(id)` and `.get(id)`.
- From `src/core/layoutTree.ts`: `collectModuleIds(node): string[]` and `removePanel(node, moduleId): LayoutNode | null` (removes a panel and normalizes; returns null if the whole tree was that one panel).

## Interfaces this task PRODUCES
- `interface ViewDef { id: string; name: string; icon: string; layout: LayoutNode; builtIn?: boolean }`
- `interface ViewsState { views: ViewDef[]; activeId?: string }`
- `class ViewsStore extends Emitter<ViewsState>` with:
  - `constructor(builtIns: ViewDef[], registry: PanelRegistry)`
  - `getState(): ViewsState`
  - `hydrate(state: ViewsState): void` — prunes each view's layout to the registry (drop panels whose module id is absent), then re-injects any built-in (by id) missing from the saved set; sets activeId.
  - `setActive(id: string): void`
  - `createView(name: string, layout: LayoutNode): string` — returns new id, makes it active
  - `duplicateView(id: string): string`
  - `renameView(id: string, name: string): void`
  - `deleteView(id: string): void` — no-op for built-ins
  - `updateLayout(id: string, layout: LayoutNode): void`
  - `resetBuiltIn(id: string): void` — restores a built-in's layout from the original code default

## Files
- Create: `src/modules/views/viewsStore.ts`
- Test: `src/modules/views/viewsStore.test.ts`

## TDD steps

### Step 1: Write the failing test
```ts
// src/modules/views/viewsStore.test.ts
import { describe, it, expect } from 'vitest'
import { ViewsStore, type ViewDef } from './viewsStore'
import { buildRegistry, type PanelType } from '../../core/panelRegistry'
import type { LayoutNode, WorkspaceModule } from '../../core/types'

const mod = (id: string): WorkspaceModule => ({ id, title: id, locality: 'LOCAL', tools: [], render: () => null as never })
const reg = buildRegistry([
  { id: 'file-tree', label: 'File tree', icon: '📁', module: mod('file-tree') } as PanelType,
  { id: 'ai-chat', label: 'AI chat', icon: '💬', module: mod('ai-chat') } as PanelType,
])
const treeLayout: LayoutNode = { type: 'panel', moduleId: 'file-tree' }
const builtIns = (): ViewDef[] => [{ id: 'editor', name: 'Editor', icon: '🗂', layout: treeLayout, builtIn: true }]

describe('ViewsStore', () => {
  it('seeds built-ins and a default active id', () => {
    const s = new ViewsStore(builtIns(), reg)
    expect(s.getState().views.map((v) => v.id)).toEqual(['editor'])
    expect(s.getState().activeId).toBe('editor')
  })

  it('creates, renames, and deletes user views', () => {
    const s = new ViewsStore(builtIns(), reg)
    const id = s.createView('Mine', treeLayout)
    expect(s.getState().views.find((v) => v.id === id)?.name).toBe('Mine')
    s.renameView(id, 'Yours')
    expect(s.getState().views.find((v) => v.id === id)?.name).toBe('Yours')
    s.deleteView(id)
    expect(s.getState().views.find((v) => v.id === id)).toBeUndefined()
  })

  it('does not delete built-ins', () => {
    const s = new ViewsStore(builtIns(), reg)
    s.deleteView('editor')
    expect(s.getState().views.find((v) => v.id === 'editor')).toBeDefined()
  })

  it('prunes layout panels missing from the registry on hydrate', () => {
    const s = new ViewsStore(builtIns(), reg)
    const dirty: LayoutNode = { type: 'split', direction: 'horizontal', children: [
      { type: 'panel', moduleId: 'file-tree' }, { type: 'panel', moduleId: 'ghost' },
    ] }
    s.hydrate({ views: [{ id: 'u1', name: 'U', icon: '★', layout: dirty }], activeId: 'u1' })
    const v = s.getState().views.find((x) => x.id === 'u1')!
    expect(collectIds(v.layout)).toEqual(['file-tree'])
  })

  it('re-injects built-ins missing from saved state on hydrate', () => {
    const s = new ViewsStore(builtIns(), reg)
    s.hydrate({ views: [{ id: 'u1', name: 'U', icon: '★', layout: treeLayout }], activeId: 'u1' })
    expect(s.getState().views.some((v) => v.id === 'editor')).toBe(true)
  })
})

function collectIds(n: LayoutNode): string[] {
  return n.type === 'panel' ? [n.moduleId] : n.children.flatMap(collectIds)
}
```

### Step 2: Run, verify FAIL — `npm test -- viewsStore` → FAIL.

### Step 3: Implementation
```ts
// src/modules/views/viewsStore.ts
import { Emitter } from '../../core/emitter'
import type { LayoutNode } from '../../core/types'
import type { PanelRegistry } from '../../core/panelRegistry'
import { collectModuleIds, removePanel } from '../../core/layoutTree'

export interface ViewDef { id: string; name: string; icon: string; layout: LayoutNode; builtIn?: boolean }
export interface ViewsState { views: ViewDef[]; activeId?: string }

/** Drop any panel whose module id is absent from the registry; never returns null (keeps at least the tree). */
function pruneToRegistry(layout: LayoutNode, registry: PanelRegistry): LayoutNode {
  let next: LayoutNode | null = layout
  for (const id of collectModuleIds(layout)) {
    if (!registry.has(id) && next) next = removePanel(next, id)
  }
  return next ?? layout
}

export class ViewsStore extends Emitter<ViewsState> {
  private state: ViewsState
  private readonly registry: PanelRegistry
  private readonly builtInDefs: Map<string, ViewDef>

  constructor(builtIns: ViewDef[], registry: PanelRegistry) {
    super()
    this.registry = registry
    this.builtInDefs = new Map(builtIns.map((v) => [v.id, { ...v, builtIn: true }]))
    this.state = { views: builtIns.map((v) => ({ ...v, builtIn: true })), activeId: builtIns[0]?.id }
  }

  getState = (): ViewsState => this.state

  hydrate(state: ViewsState): void {
    const pruned = (state?.views ?? []).map((v) => ({ ...v, layout: pruneToRegistry(v.layout, this.registry) }))
    const have = new Set(pruned.map((v) => v.id))
    const missingBuiltIns = [...this.builtInDefs.values()].filter((b) => !have.has(b.id))
    const views = [...missingBuiltIns, ...pruned]
    this.state = { views, activeId: state?.activeId ?? views[0]?.id }
    this.notify()
  }

  setActive(id: string): void {
    this.state = { ...this.state, activeId: id }
    this.notify()
  }

  createView(name: string, layout: LayoutNode): string {
    const id = crypto.randomUUID()
    this.state = { views: [...this.state.views, { id, name, icon: '🧩', layout }], activeId: id }
    this.notify()
    return id
  }

  duplicateView(id: string): string {
    const src = this.state.views.find((v) => v.id === id)
    if (!src) return id
    return this.createView(`${src.name} copy`, src.layout)
  }

  renameView(id: string, name: string): void {
    this.state = { ...this.state, views: this.state.views.map((v) => (v.id === id ? { ...v, name } : v)) }
    this.notify()
  }

  deleteView(id: string): void {
    if (this.builtInDefs.has(id)) return
    const views = this.state.views.filter((v) => v.id !== id)
    const activeId = this.state.activeId === id ? views[0]?.id : this.state.activeId
    this.state = { views, activeId }
    this.notify()
  }

  updateLayout(id: string, layout: LayoutNode): void {
    this.state = { ...this.state, views: this.state.views.map((v) => (v.id === id ? { ...v, layout } : v)) }
    this.notify()
  }

  resetBuiltIn(id: string): void {
    const def = this.builtInDefs.get(id)
    if (def) this.updateLayout(id, def.layout)
  }
}
```

### Step 4: Run, verify PASS — `npm test -- viewsStore` → PASS.

### Step 5: Add a persistence round-trip test and run
Append to the same test file. FIRST verify the exact import paths/class names for the storage backend and service: run `grep -rl "class MemoryBackend" src/core/storage` and `grep -rln "scope(" src/core/storage` and look at how an existing store test (e.g. search `persistState` usage in `src/`) imports them. Then write:
```ts
// append to src/modules/views/viewsStore.test.ts (adjust the storage imports to the real paths found above)
import { MemoryBackend } from '../../core/storage/memoryBackend'
import { StorageService } from '../../core/storage/storageService'
import { persistState } from '../../core/storage/persistState'

it('round-trips through persistState', async () => {
  const backend = new MemoryBackend()
  const storage = new StorageService(backend)
  const a = new ViewsStore(builtIns(), reg)
  await persistState(a, storage.scope('views'), 'all', 0)
  const id = a.createView('Mine', treeLayout)
  await new Promise((r) => setTimeout(r, 5))
  const b = new ViewsStore(builtIns(), reg)
  await persistState(b, storage.scope('views'), 'all', 0)
  expect(b.getState().views.find((v) => v.id === id)?.name).toBe('Mine')
})
```
Run `npm test -- viewsStore` → PASS. If the storage import paths differ, fix them to match the real files (this is expected — the plan flagged it).

### Step 6: Typecheck — `npx tsc -b --noEmit` → clean.

## DO NOT
- Do NOT run any git command. Leave changes uncommitted.
- Do NOT add CRUD methods or fields beyond those listed (YAGNI).
- If `MemoryBackend`/`StorageService`/`scope`/`persistState` signatures differ from the assumptions, adapt the test to the real API and note it in your report.
