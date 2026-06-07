import type { JSX } from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import type { FeatureManifest, LayoutNode, WorkspaceModule } from '../core/types'
import './panelArea.css'

function PanelFrame({ module }: { module: WorkspaceModule }) {
  return (
    <div className="panel-frame">
      <div className="panel-frame__header">
        <span>{module.title}</span>
        <span className={`locality locality--${module.locality === 'LOCAL' ? 'local' : 'network'}`}>
          {module.locality}
        </span>
      </div>
      <div className="panel-frame__body">{module.render()}</div>
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
    <div className="panel-area">
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
