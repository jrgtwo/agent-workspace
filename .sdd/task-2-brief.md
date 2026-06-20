# Task 2: resolveView + modulesForLayout

Part of "Composable Views (v1)". Depends on Task 1 (panel registry). Produces the function that turns
a view's `LayoutNode` tree into a renderable `FeatureManifest` by resolving panel ids → modules.

## Global Constraints (bind every task)
- tsconfig `erasableSyntaxOnly: true` → NO TS constructor parameter properties.
- Match existing repo style. YAGNI.
- Tests run under Vitest in jsdom; use `.tsx` for tests containing JSX.

## Interfaces this task CONSUMES (already exist)
- From Task 1, `src/core/panelRegistry.ts`: `type PanelRegistry = Map<string, PanelType>`, `interface PanelType { id; label; icon; module }`, `function buildRegistry(types: PanelType[]): PanelRegistry`.
- From `src/core/types.ts`: `LayoutNode`, `WorkspaceModule`, `FeatureManifest`.
- From `src/core/layoutTree.ts`: `function collectModuleIds(node: LayoutNode): string[]` (returns the panel moduleIds in the tree, in order).

## Interfaces this task PRODUCES
- `function modulesForLayout(layout: LayoutNode, registry: PanelRegistry): WorkspaceModule[]`
  — maps the layout's module ids (deduped, preserving order) to their registry modules; ids absent from the registry are dropped.
- `function resolveView(view: { id: string; name: string; icon: string; layout: LayoutNode }, registry: PanelRegistry): FeatureManifest`
  — returns `{ id, name, icon, layout, modules: modulesForLayout(view.layout, registry) }`.

## Files
- Create: `src/modules/views/resolveView.ts`
- Test: `src/modules/views/resolveView.test.tsx`

## TDD steps

### Step 1: Write the failing test
```tsx
// src/modules/views/resolveView.test.tsx
import { describe, it, expect } from 'vitest'
import { buildRegistry, type PanelType } from '../../core/panelRegistry'
import type { WorkspaceModule, LayoutNode } from '../../core/types'
import { modulesForLayout, resolveView } from './resolveView'

const mod = (id: string): WorkspaceModule => ({ id, title: id, locality: 'LOCAL', tools: [], render: () => <div /> })
const reg = buildRegistry([
  { id: 'file-tree', label: 'File tree', icon: '📁', module: mod('file-tree') } as PanelType,
  { id: 'ai-chat', label: 'AI chat', icon: '💬', module: mod('ai-chat') } as PanelType,
])
const layout: LayoutNode = {
  type: 'split', direction: 'horizontal',
  children: [{ type: 'panel', moduleId: 'file-tree' }, { type: 'panel', moduleId: 'ai-chat' }],
}

describe('resolveView', () => {
  it('maps layout module ids to registry modules', () => {
    const mods = modulesForLayout(layout, reg)
    expect(mods.map((m) => m.id)).toEqual(['file-tree', 'ai-chat'])
  })
  it('drops module ids not in the registry', () => {
    const bad: LayoutNode = { type: 'panel', moduleId: 'ghost' }
    expect(modulesForLayout(bad, reg)).toEqual([])
  })
  it('builds a FeatureManifest', () => {
    const m = resolveView({ id: 'v1', name: 'Editor', icon: '🗂', layout }, reg)
    expect(m).toMatchObject({ id: 'v1', name: 'Editor', icon: '🗂', layout })
    expect(m.modules.map((x) => x.id)).toEqual(['file-tree', 'ai-chat'])
  })
})
```

### Step 2: Run, verify FAIL — `npm test -- resolveView` → FAIL.

### Step 3: Implementation
```ts
// src/modules/views/resolveView.ts
import type { LayoutNode, WorkspaceModule, FeatureManifest } from '../../core/types'
import type { PanelRegistry } from '../../core/panelRegistry'
import { collectModuleIds } from '../../core/layoutTree'

export function modulesForLayout(layout: LayoutNode, registry: PanelRegistry): WorkspaceModule[] {
  const seen = new Set<string>()
  const mods: WorkspaceModule[] = []
  for (const id of collectModuleIds(layout)) {
    if (seen.has(id)) continue
    const t = registry.get(id)
    if (t) { mods.push(t.module); seen.add(id) }
  }
  return mods
}

export function resolveView(
  view: { id: string; name: string; icon: string; layout: LayoutNode },
  registry: PanelRegistry,
): FeatureManifest {
  return { id: view.id, name: view.name, icon: view.icon, layout: view.layout, modules: modulesForLayout(view.layout, registry) }
}
```

### Step 4: Run, verify PASS — `npm test -- resolveView` → PASS.

### Step 5: Typecheck — `npx tsc -b --noEmit` → clean.

## DO NOT
- Do NOT run any git command. Leave changes uncommitted.
- Verify `collectModuleIds` exists and behaves as described by reading `src/core/layoutTree.ts` if unsure.
- YAGNI — nothing beyond the two functions.
