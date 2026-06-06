import type { JSX } from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
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
      <Group orientation={node.direction}>
        {node.children.map((child, i) => (
          <FragmentWithHandle key={`${key}-${i}`} isFirst={i === 0} direction={node.direction}>
            {renderNode(child, modules, `${key}-${i}`)}
          </FragmentWithHandle>
        ))}
      </Group>
    </Panel>
  )
}

function FragmentWithHandle({ children, isFirst, direction }: { children: JSX.Element; isFirst: boolean; direction: 'horizontal' | 'vertical' }) {
  return (
    <>
      {!isFirst && <Separator style={{ [direction === 'horizontal' ? 'width' : 'height']: 6 } as any} />}
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
        <Group orientation={root.direction}>
          {root.children.map((child, i) => (
            <FragmentWithHandle key={i} isFirst={i === 0} direction={root.direction}>
              {renderNode(child, modules, `${i}`)}
            </FragmentWithHandle>
          ))}
        </Group>
      )}
    </div>
  )
}
