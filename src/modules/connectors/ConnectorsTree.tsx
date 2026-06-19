import { useState } from 'react'
import { useStore } from '../../core/emitter'
import type { ConnectorsTreeStore } from './connectorsTreeStore'
import type { TreeNode } from './connectorsTreeParse'
import './connectors.css'

function TreeRow({ node, depth, overrides, toggle, onOpenFile }: {
  node: TreeNode
  depth: number
  overrides: Record<string, boolean>
  toggle: (path: string, open: boolean) => void
  onOpenFile: (path: string) => void
}) {
  const isDir = node.type === 'directory'
  // Roots (depth 0) default open; deeper folders default closed; user toggles override.
  const isOpen = node.path in overrides ? overrides[node.path] : depth === 0
  return (
    <>
      <button
        type="button"
        className={`connectors-tree__row connectors-tree__row--${node.type}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => (isDir ? toggle(node.path, isOpen) : onOpenFile(node.path))}
      >
        <span className="connectors-tree__icon">{isDir ? (isOpen ? '▾' : '▸') : '📄'}</span>
        <span className="connectors-tree__name">{node.name}</span>
      </button>
      {isDir && isOpen && node.children?.map((c) => (
        <TreeRow key={c.path} node={c} depth={depth + 1} overrides={overrides} toggle={toggle} onOpenFile={onOpenFile} />
      ))}
    </>
  )
}

export function ConnectorsTree({ store, onOpenFile, onRefresh }: {
  store: ConnectorsTreeStore
  onOpenFile: (path: string) => void
  onRefresh: () => void
}) {
  const { status, roots, error } = useStore(store)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const toggle = (path: string, open: boolean) => setOverrides((o) => ({ ...o, [path]: !open }))

  return (
    <div className="connectors-tree" aria-label="files">
      <div className="connectors-tree__bar">
        <span className="connectors-tree__title">Files</span>
        <button type="button" className="connectors-tree__refresh" onClick={onRefresh}>Refresh</button>
      </div>
      {status === 'ready' && roots.length > 0 ? (
        <div className="connectors-tree__body">
          {roots.map((r) => (
            <TreeRow key={r.path} node={r} depth={0} overrides={overrides} toggle={toggle} onOpenFile={onOpenFile} />
          ))}
        </div>
      ) : (
        <div className="connectors-tree__empty">
          {status === 'error'
            ? `Can't read files — the MCP bridge isn't reachable. Start it (npm run mcp-bridge) and hit Refresh.${error ? ` (${error})` : ''}`
            : status === 'loading'
              ? 'Reading files…'
              : 'No files yet. Start the bridge and Refresh.'}
        </div>
      )}
    </div>
  )
}
