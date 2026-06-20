# Task 9b: Shell + rail Views section + App wiring

Part of "Composable Views (v1)", Phase 4 — the final integration. Makes the workspace render views:
the rail gets a Views section, and selecting a view renders it through `ViewArea` with a per-view
`LayoutStore` whose changes persist back to the `ViewsStore`. Task 9a already added `registry` +
`viewsStore` to `AppServices`.

## Global Constraints
- React rules of hooks: do NOT call a hook conditionally. The new props are OPTIONAL; branch to a separate child component so existing callers (which pass no viewsStore) keep working unchanged.
- Match repo style. No raw hex in CSS. YAGNI.
- Tests run in jsdom; panel lib needs `fireEvent` + ResizeObserver (polyfilled).
- Do NOT run any git command. Leave changes uncommitted.

## Interfaces CONSUMED (exist)
- `ViewsStore`, `ViewDef` — `src/modules/views/viewsStore.ts`: `getState(): { views; activeId }`, `createView(name, layout): string`, `updateLayout(id, layout)`. Bind via `useStore`.
- `PanelRegistry` — `src/core/panelRegistry.ts`.
- `ViewArea` — `src/modules/views/ViewArea.tsx`: props `{ view, viewsStore, registry, layoutStore }`.
- `LayoutStore` — `src/core/layoutStore.ts`: `new LayoutStore(layout)`, `getState()`, `subscribe(fn)`, `reset()`, `addPanel`, `removePanelById`.
- `FeatureRail` — `src/shell/FeatureRail.tsx` (will be extended below).
- `PanelArea`, `ChangeApprovalModal`, `useStore`, `applyTheme`/`ThemeStore` — as currently imported by WorkspaceShell.

## Files
- Modify: `src/shell/WorkspaceShell.tsx`, `src/shell/FeatureRail.tsx`, `src/shell/featureRail.css`, `src/App.tsx`
- Create: `src/shell/workspaceShellViews.render.test.tsx`

## Steps

### Step 1: Write the failing test
```tsx
// src/shell/workspaceShellViews.render.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WorkspaceShell } from './WorkspaceShell'
import { ViewsStore } from '../modules/views/viewsStore'
import { buildRegistry, type PanelType } from '../core/panelRegistry'
import { LayoutStore } from '../core/layoutStore'
import { ThemeStore } from '../core/themeStore'
import type { FeatureManifest, WorkspaceModule, LayoutNode } from '../core/types'

const mod = (id: string, body: string): WorkspaceModule => ({ id, title: id, locality: 'LOCAL', tools: [], render: () => <div>{body}</div> })
const reg = buildRegistry([{ id: 'file-tree', label: 'File tree', icon: '📁', module: mod('file-tree', 'TREE') } as PanelType])
const viewLayout: LayoutNode = { type: 'panel', moduleId: 'file-tree', draggable: true }
const feature: FeatureManifest = { id: 'notes', name: 'Notes', icon: '📝', layout: { type: 'panel', moduleId: 'm' }, modules: [mod('m', 'NOTES')] }

describe('WorkspaceShell with views', () => {
  it('switches to a view and renders its panels', () => {
    const vs = new ViewsStore([{ id: 'editor', name: 'Editor', icon: '🗂', layout: viewLayout, builtIn: true }], reg)
    const layoutStores = new Map([['notes', new LayoutStore(feature.layout)]])
    render(<WorkspaceShell features={[feature]} theme={new ThemeStore()} layoutStores={layoutStores} viewsStore={vs} registry={reg} />)
    expect(screen.getByText('NOTES')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Editor/i }))
    expect(screen.getByText('TREE')).toBeInTheDocument()
  })
})
```
Confirm `new ThemeStore()` is the real no-arg constructor (read `src/core/themeStore.ts`); if it needs an arg, pass it.

### Step 2: Run, verify FAIL — `npm test -- workspaceShellViews` → FAIL.

### Step 3: Extend `FeatureRail.tsx` (keep it backward-compatible — `views` optional, default [])
```tsx
import './featureRail.css'
import type { FeatureManifest } from '../core/types'
import type { ViewDef } from '../modules/views/viewsStore'

export function FeatureRail({ features, views = [], activeId, onSelect, onNewView }: {
  features: FeatureManifest[]
  views?: ViewDef[]
  activeId: string
  onSelect: (id: string) => void
  onNewView?: () => void
}) {
  return (
    <div className="rail">
      <div className="rail__features">
        {features.map((f) => (
          <button key={f.id} title={f.name} onClick={() => onSelect(f.id)} className={`rail__btn${f.id === activeId ? ' rail__btn--active' : ''}`}>{f.icon}</button>
        ))}
      </div>
      {(views.length > 0 || onNewView) && (
        <div className="rail__views">
          {views.map((v) => (
            <button key={v.id} title={v.name} aria-label={v.name} onClick={() => onSelect(v.id)} className={`rail__btn${v.id === activeId ? ' rail__btn--active' : ''}`}>{v.icon}</button>
          ))}
          {onNewView && <button title="New view" aria-label="New view" className="rail__btn rail__btn--new" onClick={onNewView}>＋</button>}
        </div>
      )}
    </div>
  )
}
```
(The `aria-label={v.name}` is what lets tests/AT find a view by its name rather than its emoji.)

### Step 4: Add CSS to `featureRail.css`
Add a `.rail__views` block that visually separates it from `.rail__features` (e.g. a top border + small gap) and a subtle `.rail__btn--new`. Mirror the existing `.rail__features`/`.rail__btn` styles; use existing tokens (grep featureRail.css / src/styles for the border/text token names). Example:
```css
.rail__views { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); }
.rail__btn--new { opacity: 0.7; }
```

### Step 5: Rewrite `WorkspaceShell.tsx`
Keep `viewsStore`/`registry` OPTIONAL. The top-level theme hook stays; branch to a child component so hooks remain unconditional:
```tsx
import { useRef, useState, useEffect } from 'react'
import type { FeatureManifest } from '../core/types'
import { LayoutStore } from '../core/layoutStore'
import type { ProposalStore } from '../core/proposalStore'
import type { ProposalApplier } from '../core/proposalApplier'
import type { ViewsStore, ViewDef } from '../modules/views/viewsStore'
import type { PanelRegistry } from '../core/panelRegistry'
import { FeatureRail } from './FeatureRail'
import { PanelArea } from './PanelArea'
import { ViewArea } from '../modules/views/ViewArea'
import { ChangeApprovalModal } from '../modules/proposals/ChangeApprovalModal'
import { useStore } from '../core/emitter'
import { applyTheme, type ThemeStore } from '../core/themeStore'

type ShellProps = {
  features: FeatureManifest[]
  theme: ThemeStore
  layoutStores: Map<string, LayoutStore>
  proposals?: ProposalStore
  applier?: ProposalApplier
  viewsStore?: ViewsStore
  registry?: PanelRegistry
}

export function WorkspaceShell({ features, theme, layoutStores, proposals, applier, viewsStore, registry }: ShellProps) {
  const { theme: themeId } = useStore(theme)
  useEffect(() => { applyTheme(themeId) }, [themeId])
  if (viewsStore && registry) {
    return <ComposableShell features={features} layoutStores={layoutStores} proposals={proposals} applier={applier} viewsStore={viewsStore} registry={registry} />
  }
  return <LegacyShell features={features} layoutStores={layoutStores} proposals={proposals} applier={applier} />
}

function LegacyShell({ features, layoutStores, proposals, applier }: {
  features: FeatureManifest[]; layoutStores: Map<string, LayoutStore>; proposals?: ProposalStore; applier?: ProposalApplier
}) {
  const [activeId, setActiveId] = useState(features[0].id)
  const active = features.find((f) => f.id === activeId) ?? features[0]
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <FeatureRail features={features} activeId={activeId} onSelect={setActiveId} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <PanelArea manifest={active} layoutStore={layoutStores.get(active.id)!} />
      </div>
      {proposals && applier && <ChangeApprovalModal proposals={proposals} applier={applier} />}
    </div>
  )
}

function ComposableShell({ features, layoutStores, proposals, applier, viewsStore, registry }: {
  features: FeatureManifest[]; layoutStores: Map<string, LayoutStore>; proposals?: ProposalStore; applier?: ProposalApplier; viewsStore: ViewsStore; registry: PanelRegistry
}) {
  const { views } = useStore(viewsStore)
  const [activeId, setActiveId] = useState(features[0].id)
  const activeFeature = features.find((f) => f.id === activeId)
  const activeView = views.find((v) => v.id === activeId)
  const viewLayouts = useRef(new Map<string, LayoutStore>())
  const layoutFor = (view: ViewDef): LayoutStore => {
    let ls = viewLayouts.current.get(view.id)
    if (!ls) {
      ls = new LayoutStore(view.layout)
      const store = ls
      store.subscribe(() => viewsStore.updateLayout(view.id, store.getState().layout))
      viewLayouts.current.set(view.id, store)
    }
    return ls
  }
  const fallback = activeFeature ?? features[0]
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <FeatureRail
        features={features}
        views={views}
        activeId={activeId}
        onSelect={setActiveId}
        onNewView={() => setActiveId(viewsStore.createView('New view', { type: 'panel', moduleId: 'connectors-tree', draggable: true }))}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {activeView
          ? <ViewArea view={activeView} viewsStore={viewsStore} registry={registry} layoutStore={layoutFor(activeView)} />
          : <PanelArea manifest={fallback} layoutStore={layoutStores.get(fallback.id)!} />}
      </div>
      {proposals && applier && <ChangeApprovalModal proposals={proposals} applier={applier} />}
    </div>
  )
}
```

### Step 6: Wire `App.tsx`
Add the two props to the existing `<WorkspaceShell .../>` call:
`viewsStore={services.viewsStore} registry={services.registry}`.

### Step 7: Verify
- `npm test -- workspaceShellViews` → PASS.
- `npm test -- WorkspaceShell` and `npm test -- FeatureRail`/board.render → still green (Legacy path unchanged; FeatureRail views optional).
- `npm test` → green except the known pre-existing `slice.integration` failure.
- `npx tsc -b --noEmit` → clean.

## Report
Note: how you handled the optional-props/hook branch, any ThemeStore constructor adaptation, the CSS tokens used, and confirmation that existing WorkspaceShell/board tests still pass unchanged.

## DO NOT
- Do NOT run git. Do NOT make viewsStore/registry required (keeps existing tests on the Legacy path). Do NOT change LegacyShell behavior. YAGNI.
