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

export function PanelArea({ manifest, layoutStore, onRemovePanel, showReset = true }: { manifest: FeatureManifest; layoutStore: LayoutStore; onRemovePanel?: (moduleId: string) => void; showReset?: boolean }) {
  const { layout } = useStore(layoutStore)
  const { startDrag, overlay } = useDragLayer(layoutStore)
  const modules = new Map(manifest.modules.map((m) => [m.id, m]))
  return (
    <div className="panel-area">
      {showReset !== false && <button type="button" className="panel-area__reset" aria-label="Reset layout" onClick={() => layoutStore.reset()}>⤺ reset layout</button>}
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
