# Task 9a: Panel registry + ViewsStore wired into services.ts (data layer)

Part of "Composable Views (v1)", Phase 4. This builds the panel registry and the `ViewsStore` (seeded
with the Editor + Reader default views) inside the composition root and returns them in `AppServices`.
No shell/UI here — that's Task 9b. After this task the app must still build and all tests pass; the
new wiring is dormant until 9b consumes it.

## Global Constraints
- erasableSyntaxOnly. Match repo style. YAGNI.
- Persistence: `persistState(store, storage.scope('<scope>'), key)`.
- Registry keys MUST equal each module's `.id` (later, PanelArea looks up `manifest.modules` by `node.moduleId`).
- Do NOT run any git command. Leave changes uncommitted.

## Interfaces CONSUMED (exist)
- `buildRegistry` / `PanelType` — `src/core/panelRegistry.ts`.
- `ViewsStore` / `ViewDef` — `src/modules/views/viewsStore.ts`: `new ViewsStore(builtIns: ViewDef[], registry)`, persistable (getState/hydrate/subscribe).
- `OpenDocsStore` is already created in services.ts as `openDocs` (Task 5).
- `memoryModule` is already created in services.ts: `const memoryModule = createMemoryViewerModule(memory)` (~line 317). Use `memoryModule.id` as the registry key (do not hardcode it).
- `connectorsFeature` (created ~line 365 via `createConnectorsFeature`) is a `FeatureManifest`; its `.modules` array contains the connectors module instances with ids `connectors-tree`, `connectors-panel`, `ai-chat`, `connectors-viewer`. Reuse the SAME instances for the registry (do NOT create new ones).
- `persistState` — `src/core/storage/persistState`. `storage.scope(name)` exists.

## Interfaces PRODUCED
- New `DEFAULT_VIEWS: ViewDef[]` in `src/modules/views/defaultViews.ts`.
- `AppServices` gains `registry: PanelRegistry` and `viewsStore: ViewsStore`, both returned from `createServices`.

## Files
- Create: `src/modules/views/defaultViews.ts`
- Modify: `src/app/services.ts`
- Create: `src/app/services.views.test.ts`

## Steps

### Step 1: Create `src/modules/views/defaultViews.ts`
```ts
// src/modules/views/defaultViews.ts
import type { ViewDef } from './viewsStore'

export const DEFAULT_VIEWS: ViewDef[] = [
  {
    id: 'editor', name: 'Editor', icon: '🗂', builtIn: true,
    layout: { type: 'split', direction: 'horizontal', children: [
      { type: 'panel', moduleId: 'connectors-tree', size: 20, draggable: true },
      { type: 'panel', moduleId: 'connectors-viewer', size: 50, draggable: true },
      { type: 'panel', moduleId: 'ai-chat', size: 30, draggable: true },
    ] },
  },
  {
    id: 'reader', name: 'Reader', icon: '📑', builtIn: true,
    layout: { type: 'split', direction: 'horizontal', children: [
      { type: 'panel', moduleId: 'connectors-tree', size: 28, draggable: true },
      { type: 'panel', moduleId: 'connectors-viewer', size: 72, draggable: true },
    ] },
  },
]
```

### Step 2: Wire `services.ts`
Read the file around the connectors region (~lines 339-380) and the `AppServices` interface (~line 162) and the final `return { ... }` (~line 480) first.

1. Add imports near the other module/store imports:
```ts
import { buildRegistry, type PanelType, type PanelRegistry } from '../core/panelRegistry'
import { ViewsStore } from '../modules/views/viewsStore'
import { DEFAULT_VIEWS } from '../modules/views/defaultViews'
```
2. AFTER `const connectorsFeature = createConnectorsFeature({ ... })` is created, build the registry by reusing the connectors feature's own module instances + the shared `memoryModule`:
```ts
const connectorsModules = new Map(connectorsFeature.modules.map((m) => [m.id, m]))
const panelRegistry = buildRegistry([
  { id: 'connectors-tree', label: 'File tree', icon: '📁', module: connectorsModules.get('connectors-tree')! },
  { id: 'connectors-viewer', label: 'Document viewer', icon: '📄', module: connectorsModules.get('connectors-viewer')! },
  { id: 'ai-chat', label: 'AI chat', icon: '💬', module: connectorsModules.get('ai-chat')! },
  { id: memoryModule.id, label: 'Memory', icon: '🧠', module: memoryModule },
] as PanelType[])
const viewsStore = new ViewsStore(DEFAULT_VIEWS, panelRegistry)
await persistState(viewsStore, storage.scope('views'), 'all')
```
(If `memoryModule` is declared AFTER the connectors block, move this registry/viewsStore block to a point where BOTH `connectorsFeature` and `memoryModule` are already defined — `memoryModule` is ~line 317, connectors ~line 365, so place the block after line 365. Confirm by reading.)
3. Extend the `AppServices` interface (~line 162) with:
```ts
  registry: PanelRegistry
  viewsStore: ViewsStore
```
4. Extend the final `return { ... }` object to include `registry: panelRegistry, viewsStore`.

### Step 3: Add a wiring test `src/app/services.views.test.ts`
First read an existing test that calls `createServices` (e.g. a persistence/integration test under `src/app/` or `src/core/storage/`) to copy the exact `backend`/`mcpClient` injection shape and import paths. Then:
```ts
// src/app/services.views.test.ts  (adapt imports to the real paths used by existing createServices tests)
import { describe, it, expect } from 'vitest'
import { createServices } from './services'
import { MemoryBackend } from '../core/storage/memoryBackend'

const fakeMcp = { listTools: async () => [], call: async () => ({ ok: true, text: '' }) }

describe('composable views wiring', () => {
  it('exposes a panel registry and the default views', async () => {
    const s = await createServices({ backend: new MemoryBackend(), mcpClient: fakeMcp as never })
    expect(s.viewsStore.getState().views.map((v) => v.id)).toEqual(['editor', 'reader'])
    expect(s.registry.has('connectors-tree')).toBe(true)
    expect(s.registry.has('connectors-viewer')).toBe(true)
    expect(s.registry.has('ai-chat')).toBe(true)
  })
})
```
If `CreateServicesOpts` uses a different option name than `backend` or `mcpClient`, match the real names (read the `CreateServicesOpts` type + an existing test).

### Step 4: Verify
- `npm test -- services.views` → PASS.
- `npx tsc -b --noEmit` → clean.
- `npm test` → green except the known pre-existing `slice.integration` failure (do not touch it).

## Report
List exact services.ts edit locations (line ranges), where you placed the registry/viewsStore block, the memory module id used, the `CreateServicesOpts` option names you used in the test, test output, concerns.

## DO NOT
- Do NOT run git. Do NOT touch WorkspaceShell/FeatureRail/App.tsx (that's Task 9b). Do NOT create new connectors module instances — reuse `connectorsFeature.modules`. Do NOT touch the slice.integration test. YAGNI.
