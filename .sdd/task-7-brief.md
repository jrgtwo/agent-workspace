# Task 7: ViewArea + Add-panel menu

Part of "Composable Views (v1)", Phase 4. `ViewArea` renders one view: a top bar (title, "＋ Add panel"
menu, Reset for built-ins) over a `PanelArea` driven by a per-view `LayoutStore`. Add/remove a panel via
the store methods from Task 6. The per-view `LayoutStore` instance is OWNED BY THE CALLER (WorkspaceShell,
Task 9) — `ViewArea` just receives it as a prop.

## Global Constraints
- Match repo style. No raw hex in CSS — use real tokens from `src/styles/` (grep, e.g. `--surface`/`--border`/`--text`/`--text-muted`/`--accent`). YAGNI.
- Tests run in jsdom; panel lib needs `fireEvent` + ResizeObserver (polyfilled in src/test/setup.ts).
- Do NOT run any git command. Leave changes uncommitted.

## Interfaces CONSUMED (exist)
- `ViewsStore`, `ViewDef` — `src/modules/views/viewsStore.ts` (Task 3): `resetBuiltIn(id)`, `updateLayout(id, layout)`, `getState()`.
- `PanelRegistry` — `src/core/panelRegistry.ts` (Task 1): a `Map<string, PanelType>` where `PanelType = { id; label; icon; module }`. Iterate with `[...registry.values()]`.
- `modulesForLayout(layout, registry)` — `src/modules/views/resolveView.ts` (Task 2).
- `LayoutStore` — `src/core/layoutStore.ts` (Task 6): `getState(): { layout }`, `addPanel(id)`, `removePanelById(id)`, `reset()`. Bind with `useStore`.
- `collectModuleIds(layout)` — `src/core/layoutTree.ts`.
- `PanelArea` — `src/shell/PanelArea.tsx` (Task 8): props `{ manifest, layoutStore, onRemovePanel? }`.
- `useStore` — `src/core/emitter.ts`.

## Interfaces PRODUCED
- `AddPanelMenu({ registry, present, onAdd }: { registry: PanelRegistry; present: string[]; onAdd: (id: string) => void })` — a "＋ Add panel ▾" button that toggles a `role="menu"` listing registry types whose id is NOT in `present`; each is a `role="menuitem"` button labeled `{icon} {label}` that calls `onAdd(id)`.
- `ViewArea({ view, viewsStore, registry, layoutStore }: { view: ViewDef; viewsStore: ViewsStore; registry: PanelRegistry; layoutStore: LayoutStore })`.

## Files
- Create: `src/modules/views/ViewArea.tsx`, `src/modules/views/AddPanelMenu.tsx`, `src/modules/views/views.css`
- Create: `src/modules/views/ViewArea.render.test.tsx`

## TDD steps

### Step 1: Write the failing test
```tsx
// src/modules/views/ViewArea.render.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ViewArea } from './ViewArea'
import { ViewsStore } from './viewsStore'
import { LayoutStore } from '../../core/layoutStore'
import { buildRegistry, type PanelType } from '../../core/panelRegistry'
import type { WorkspaceModule, LayoutNode } from '../../core/types'

const mod = (id: string, title: string): WorkspaceModule => ({ id, title, locality: 'LOCAL', tools: [], render: () => <div>{title} body</div> })
const reg = buildRegistry([
  { id: 'file-tree', label: 'File tree', icon: '📁', module: mod('file-tree', 'Tree') } as PanelType,
  { id: 'ai-chat', label: 'AI chat', icon: '💬', module: mod('ai-chat', 'Chat') } as PanelType,
])
const layout: LayoutNode = { type: 'panel', moduleId: 'file-tree', draggable: true }

describe('ViewArea', () => {
  it('renders the view panels and offers un-added panels in Add menu', () => {
    const vs = new ViewsStore([{ id: 'editor', name: 'Editor', icon: '🗂', layout, builtIn: true }], reg)
    const ls = new LayoutStore(layout)
    render(<ViewArea view={vs.getState().views[0]} viewsStore={vs} registry={reg} layoutStore={ls} />)
    expect(screen.getByText('Tree body')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /add panel/i }))
    expect(screen.getByRole('menuitem', { name: /AI chat/i })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /File tree/i })).toBeNull()
  })
})
```

### Step 2: Run, verify FAIL — `npm test -- ViewArea` → FAIL.

### Step 3: Implement `AddPanelMenu.tsx`
```tsx
// src/modules/views/AddPanelMenu.tsx
import { useState } from 'react'
import type { PanelRegistry } from '../../core/panelRegistry'

export function AddPanelMenu({ registry, present, onAdd }: { registry: PanelRegistry; present: string[]; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const choices = [...registry.values()].filter((t) => !present.includes(t.id))
  return (
    <div className="views-addmenu">
      <button type="button" className="views-addmenu__btn" onClick={() => setOpen((o) => !o)}>＋ Add panel ▾</button>
      {open && (
        <div className="views-addmenu__list" role="menu">
          {choices.map((t) => (
            <button key={t.id} type="button" role="menuitem" onClick={() => { onAdd(t.id); setOpen(false) }}>
              {t.icon} {t.label}
            </button>
          ))}
          {choices.length === 0 && <span className="views-addmenu__empty">All panels added</span>}
        </div>
      )}
    </div>
  )
}
```

### Step 4: Implement `ViewArea.tsx`
```tsx
// src/modules/views/ViewArea.tsx
import { useStore } from '../../core/emitter'
import type { LayoutStore } from '../../core/layoutStore'
import type { PanelRegistry } from '../../core/panelRegistry'
import { collectModuleIds } from '../../core/layoutTree'
import { modulesForLayout } from './resolveView'
import type { ViewDef, ViewsStore } from './viewsStore'
import { PanelArea } from '../../shell/PanelArea'
import { AddPanelMenu } from './AddPanelMenu'
import './views.css'

export function ViewArea({ view, viewsStore, registry, layoutStore }: {
  view: ViewDef
  viewsStore: ViewsStore
  registry: PanelRegistry
  layoutStore: LayoutStore
}) {
  const { layout } = useStore(layoutStore)
  const manifest = { id: view.id, name: view.name, icon: view.icon, layout, modules: modulesForLayout(layout, registry) }
  const present = collectModuleIds(layout)
  return (
    <div className="views-area">
      <div className="views-area__bar">
        <span className="views-area__title">{view.icon} {view.name}</span>
        <AddPanelMenu registry={registry} present={present} onAdd={(id) => layoutStore.addPanel(id)} />
        {view.builtIn && <button type="button" className="views-area__reset" onClick={() => { viewsStore.resetBuiltIn(view.id); layoutStore.reset() }}>Reset</button>}
      </div>
      <div className="views-area__panels">
        <PanelArea manifest={manifest} layoutStore={layoutStore} onRemovePanel={(id) => layoutStore.removePanelById(id)} />
      </div>
    </div>
  )
}
```
Note: `viewsStore` is used (resetBuiltIn) and is a real prop even though the happy-path test doesn't click Reset — keep it; Task 9 relies on this signature. The unused-var linter won't fire because it IS used in the Reset handler.

### Step 5: Add `views.css`
```css
.views-area { display: flex; flex-direction: column; height: 100%; }
.views-area__bar { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-bottom: 1px solid var(--border); }
.views-area__title { font-weight: 600; }
.views-area__reset { margin-left: auto; background: transparent; border: 1px solid var(--border); border-radius: 5px; color: var(--text-muted); cursor: pointer; padding: 2px 8px; }
.views-area__panels { flex: 1; min-height: 0; position: relative; }
.views-addmenu { position: relative; }
.views-addmenu__btn { background: transparent; border: 1px solid var(--border); border-radius: 5px; color: var(--accent); cursor: pointer; padding: 2px 8px; }
.views-addmenu__list { position: absolute; top: 100%; left: 0; margin-top: 4px; z-index: 10; min-width: 160px; display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 4px 0; }
.views-addmenu__list button { text-align: left; background: transparent; border: none; color: var(--text); cursor: pointer; padding: 4px 12px; }
.views-addmenu__list button:hover { background: var(--surface-2); }
.views-addmenu__empty { padding: 4px 12px; color: var(--text-muted); }
```
(Verify these token names exist in `src/styles/`; substitute real ones if `--surface`/`--surface-2`/`--text-muted`/`--accent`/`--border`/`--text` differ. No raw hex.)

### Step 6: Run, verify PASS — `npm test -- ViewArea` → PASS.

### Step 7: Typecheck — `npx tsc -b --noEmit` → clean. Run `npm test` to confirm nothing else broke.

## DO NOT
- Do NOT run git. Do NOT make `ViewArea` own/create the LayoutStore (the caller passes it). YAGNI — only these components + CSS.
