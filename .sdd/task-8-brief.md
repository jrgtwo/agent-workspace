# Task 8: PanelArea per-panel remove control

Part of "Composable Views (v1)", Phase 4. Adds an optional `onRemovePanel` to `PanelArea`; when set,
each draggable panel header shows a `✕` remove button. Optional prop → existing features (which don't
pass it) are unaffected.

## Global Constraints
- Match existing repo style. YAGNI. Tests run in jsdom; the panel lib needs `fireEvent` (not userEvent) and `ResizeObserver` (already polyfilled in src/test/setup.ts).
- Do NOT run any git command. Leave changes uncommitted.

## Interfaces PRODUCED
- `PanelArea` gains optional prop `onRemovePanel?: (moduleId: string) => void`.
- `PanelFrame` gains optional `onRemove?: (id: string) => void`; renders a `✕` button (`aria-label={`remove ${module.title}`}`) only when `draggable && onRemove`.

## Files
- Modify: `src/shell/PanelArea.tsx`, `src/shell/panelArea.css`
- Create: `src/shell/panelAreaRemove.render.test.tsx`

## TDD steps

### Step 1: Write the failing test
```tsx
// src/shell/panelAreaRemove.render.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PanelArea } from './PanelArea'
import { LayoutStore } from '../core/layoutStore'
import type { FeatureManifest, LayoutNode } from '../core/types'

const layout: LayoutNode = { type: 'split', direction: 'horizontal', children: [
  { type: 'panel', moduleId: 'a', draggable: true }, { type: 'panel', moduleId: 'b', draggable: true },
] }
const manifest: FeatureManifest = {
  id: 'v', name: 'V', icon: '★', layout,
  modules: [
    { id: 'a', title: 'A', locality: 'LOCAL', tools: [], render: () => <div>A</div> },
    { id: 'b', title: 'B', locality: 'LOCAL', tools: [], render: () => <div>B</div> },
  ],
}

describe('PanelArea remove', () => {
  it('calls onRemovePanel when a panel close is clicked', () => {
    const onRemove = vi.fn()
    const ls = new LayoutStore(layout)
    render(<PanelArea manifest={manifest} layoutStore={ls} onRemovePanel={onRemove} />)
    fireEvent.click(screen.getByRole('button', { name: /remove A/i }))
    expect(onRemove).toHaveBeenCalledWith('a')
  })
})
```

### Step 2: Run, verify FAIL — `npm test -- panelAreaRemove` → FAIL.

### Step 3: Implement — replace `src/shell/PanelArea.tsx` with this (it is the current file plus the `onRemove`/`onRemovePanel` threading; `FragmentWithHandle` and CSS import unchanged):
```tsx
import type { CSSProperties, JSX, PointerEvent as ReactPointerEvent } from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import type { FeatureManifest, LayoutNode, WorkspaceModule } from '../core/types'
import type { LayoutStore } from '../core/layoutStore'
import { useStore } from '../core/emitter'
import { useDragLayer } from './DragLayer'
import './panelArea.css'

function PanelFrame({ module, draggable, onGrip, onRemove }: { module: WorkspaceModule; draggable?: boolean; onGrip?: (id: string, e: ReactPointerEvent) => void; onRemove?: (id: string) => void }) {
  return (
    <div className="panel-frame" data-module={module.id}>
      <div className="panel-frame__header">
        {draggable && (
          <button type="button" className="panel-frame__grip" aria-label={`drag ${module.title}`}
            onPointerDown={(e) => onGrip?.(module.id, e)}>⠿</button>
        )}
        <span>{module.title}</span>
        <span className={`locality locality--${module.locality === 'LOCAL' ? 'local' : 'network'}`}>{module.locality}</span>
        {draggable && onRemove && (
          <button type="button" className="panel-frame__remove" aria-label={`remove ${module.title}`}
            onClick={() => onRemove(module.id)}>✕</button>
        )}
      </div>
      <div className="panel-frame__body">{module.render()}</div>
    </div>
  )
}

function renderNode(node: LayoutNode, modules: Map<string, WorkspaceModule>, key: string, onGrip: (id: string, e: ReactPointerEvent) => void, onRemove?: (id: string) => void): JSX.Element {
  if (node.type === 'panel') {
    const mod = modules.get(node.moduleId)
    if (!mod) return <Panel key={key}><div>Unknown module: {node.moduleId}</div></Panel>
    return (
      <Panel key={node.moduleId} defaultSize={node.size ?? mod.layoutHints?.defaultSize} minSize={mod.layoutHints?.minSize} collapsible={node.collapsible ?? mod.layoutHints?.collapsible}>
        <div style={{ height: '100%', padding: 4 }}><PanelFrame module={mod} draggable={node.draggable} onGrip={onGrip} onRemove={onRemove} /></div>
      </Panel>
    )
  }
  return (
    <Panel key={key} defaultSize={node.size}>
      <Group orientation={node.direction}>
        {node.children.map((child, i) => (
          <FragmentWithHandle key={`${key}-${i}`} isFirst={i === 0} direction={node.direction}>
            {renderNode(child, modules, `${key}-${i}`, onGrip, onRemove)}
          </FragmentWithHandle>
        ))}
      </Group>
    </Panel>
  )
}

function FragmentWithHandle({ children, isFirst, direction }: { children: JSX.Element; isFirst: boolean; direction: 'horizontal' | 'vertical' }) {
  return (
    <>
      {!isFirst && <Separator style={{ [direction === 'horizontal' ? 'width' : 'height']: 6 } as CSSProperties} />}
      {children}
    </>
  )
}

export function PanelArea({ manifest, layoutStore, onRemovePanel }: { manifest: FeatureManifest; layoutStore: LayoutStore; onRemovePanel?: (moduleId: string) => void }) {
  const { layout } = useStore(layoutStore)
  const { startDrag, overlay } = useDragLayer(layoutStore)
  const modules = new Map(manifest.modules.map((m) => [m.id, m]))
  return (
    <div className="panel-area">
      <button type="button" className="panel-area__reset" aria-label="Reset layout" onClick={() => layoutStore.reset()}>⤺ reset layout</button>
      {layout.type === 'panel' ? (
        <div style={{ height: '100%', padding: 4 }}>
          <PanelFrame module={modules.get(layout.moduleId)!} draggable={layout.draggable} onGrip={startDrag} onRemove={onRemovePanel} />
        </div>
      ) : (
        <Group orientation={layout.direction}>
          {layout.children.map((child, i) => (
            <FragmentWithHandle key={i} isFirst={i === 0} direction={layout.direction}>
              {renderNode(child, modules, `${i}`, startDrag, onRemovePanel)}
            </FragmentWithHandle>
          ))}
        </Group>
      )}
      {overlay}
    </div>
  )
}
```
IMPORTANT: before pasting, read the CURRENT `src/shell/PanelArea.tsx` and confirm it matches the pre-change shape above (same imports, same `FragmentWithHandle`, same reset button). If anything differs, apply ONLY the `onRemove`/`onRemovePanel` additions to the real file rather than blindly overwriting.

### Step 4: Add CSS to `src/shell/panelArea.css`
Find the existing `.panel-frame__grip` rule and add a sibling mirroring it:
```css
.panel-frame__remove {
  margin-left: 6px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}
.panel-frame__remove:hover { color: var(--text); }
```
(Confirm `--text-muted` / `--text` exist in the token files; substitute the real token names used by `.panel-frame__grip` if different. No raw hex.)

### Step 5: Run, verify PASS — `npm test -- panelAreaRemove` → PASS.

### Step 6: Confirm no regressions — `npm test -- PanelArea` and the shell tests stay green (the new prop is optional; features don't pass it). `npx tsc -b --noEmit` → clean.

## DO NOT
- Do NOT run git. Do NOT change drag/reset behavior. Do NOT make features pass onRemovePanel (that's the views layer, later). YAGNI — only the remove threading + button + CSS.
