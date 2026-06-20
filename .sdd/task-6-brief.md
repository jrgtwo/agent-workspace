# Task 6: LayoutStore add/remove panel

Part of "Composable Views (v1)", Phase 3. Adds two methods to the existing `LayoutStore` so a view can
gain/lose panels at runtime. Uses the existing pure tree ops in `src/core/layoutTree.ts`.

## Global Constraints
- erasableSyntaxOnly (no ctor param properties). Match existing repo style. YAGNI.
- Do NOT run any git command. Leave changes uncommitted.

## Interfaces CONSUMED (exist in src/core/layoutTree.ts)
- `collectModuleIds(node: LayoutNode): string[]`
- `insertRelative(node, targetId, moved: LayoutNode, zone: 'left'|'right'|'top'|'bottom'|'center'): LayoutNode` — places `moved` beside the target panel.
- `removePanel(node, moduleId): LayoutNode | null` — removes the panel and normalizes; null if the whole tree was that one panel.
- `normalize(node): LayoutNode`
- `move` and `type Zone` already imported by layoutStore.ts.

## Existing file: `src/core/layoutStore.ts`
Current top imports include: `import { collectModuleIds, move as moveNode, type Zone } from './layoutTree'` (line 3). The class has private `state: LayoutState`, readonly `def: LayoutNode`, `getState`, `hydrate`, `move`, `reset`.

## Interfaces PRODUCED (added to LayoutStore)
- `addPanel(moduleId: string): void` — append a new draggable panel to the right of the last panel; no-op if `moduleId` already present.
- `removePanelById(moduleId: string): void` — remove it; no-op if it's the only panel left.

## Files
- Modify: `src/core/layoutStore.ts`
- Create (or append if exists): `src/core/layoutStore.test.ts`

## TDD steps

### Step 1: Write the failing test (create src/core/layoutStore.test.ts)
```ts
// src/core/layoutStore.test.ts
import { describe, it, expect } from 'vitest'
import { LayoutStore } from './layoutStore'
import { collectModuleIds } from './layoutTree'
import type { LayoutNode } from './types'

const base: LayoutNode = { type: 'split', direction: 'horizontal', children: [
  { type: 'panel', moduleId: 'a', draggable: true }, { type: 'panel', moduleId: 'b', draggable: true },
] }

describe('LayoutStore add/remove', () => {
  it('adds a new panel', () => {
    const s = new LayoutStore(base)
    s.addPanel('c')
    expect(collectModuleIds(s.getState().layout).sort()).toEqual(['a', 'b', 'c'])
  })
  it('is a no-op when the panel already exists', () => {
    const s = new LayoutStore(base)
    const before = s.getState().layout
    s.addPanel('a')
    expect(s.getState().layout).toBe(before)
  })
  it('removes a panel', () => {
    const s = new LayoutStore(base)
    s.removePanelById('b')
    expect(collectModuleIds(s.getState().layout)).toEqual(['a'])
  })
  it('will not remove the last panel', () => {
    const s = new LayoutStore({ type: 'panel', moduleId: 'a', draggable: true })
    const before = s.getState().layout
    s.removePanelById('a')
    expect(s.getState().layout).toBe(before)
  })
})
```

### Step 2: Run, verify FAIL — `npm test -- layoutStore` → FAIL (addPanel/removePanelById not functions).

### Step 3: Implement
Update the import line at the top of `src/core/layoutStore.ts` to also bring in the ops:
```ts
import { collectModuleIds, insertRelative, move as moveNode, normalize, removePanel, type Zone } from './layoutTree'
```
Add these two methods inside the `LayoutStore` class (e.g. after `move`):
```ts
addPanel(moduleId: string): void {
  const ids = collectModuleIds(this.state.layout)
  if (ids.includes(moduleId)) return
  const anchor = ids[ids.length - 1]
  const moved: LayoutNode = { type: 'panel', moduleId, draggable: true }
  const next = normalize(insertRelative(this.state.layout, anchor, moved, 'right'))
  this.state = { layout: next }
  this.notify()
}

removePanelById(moduleId: string): void {
  if (collectModuleIds(this.state.layout).length <= 1) return
  const next = removePanel(this.state.layout, moduleId)
  if (!next) return
  this.state = { layout: next }
  this.notify()
}
```
`LayoutNode` is already imported in layoutStore.ts (`import type { LayoutNode } from './types'`). If not, add it.

### Step 4: Run, verify PASS — `npm test -- layoutStore` → PASS.

### Step 5: Typecheck — `npx tsc -b --noEmit` → clean. Also confirm `npm test -- layoutStore` and that you didn't break existing layout behavior (the existing `move`/`reset`/`hydrate` are untouched).

## DO NOT
- Do NOT run git. Do NOT change `move`/`reset`/`hydrate`/`reconcile`. YAGNI — only the two methods.
