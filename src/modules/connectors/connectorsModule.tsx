import type { JSX } from 'react'
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { McpStore } from '../../core/mcp/mcpStore'
import './connectors.css'

function statusLabel(s: string): string {
  return s === 'ready' ? 'connected' : s === 'loading' ? 'connecting…' : s === 'error' ? 'offline' : 'idle'
}

function ConnectorsPanel({ store, onRefresh }: { store: McpStore; onRefresh: () => void }): JSX.Element {
  const { status, tools, error } = useStore(store)
  return (
    <div className="connectors" aria-label="connectors">
      <div className="connectors__bar">
        <span className="connectors__status" data-status={status}>{statusLabel(status)}</span>
        <button type="button" className="connectors__refresh" onClick={onRefresh}>Refresh</button>
      </div>
      {status === 'ready' && tools.length > 0 ? (
        <ul className="connectors__list">
          {tools.map((t) => (
            <li key={t.name} className="connectors__tool">
              <span className="connectors__tool-name">{t.name}</span>
              <span className="connectors__tool-desc">{t.description}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="connectors__empty">
          {status === 'error'
            ? `No connectors — the MCP bridge isn't reachable. Start it (npm run mcp-bridge) and hit Refresh.${error ? ` (${error})` : ''}`
            : status === 'loading'
              ? 'Connecting to the MCP bridge…'
              : 'No connector tools available yet. Start the bridge and Refresh.'}
        </div>
      )}
    </div>
  )
}

export function createConnectorsModule(store: McpStore, onRefresh: () => void): WorkspaceModule {
  return {
    id: 'connectors-panel',
    title: 'Connectors',
    locality: 'NETWORK',
    tools: [],
    render: () => <ConnectorsPanel store={store} onRefresh={onRefresh} />,
  }
}
