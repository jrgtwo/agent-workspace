import type { WorkspaceModule } from '../../core/types'
import './dataSettings.css'

function DataPanel({ clearAll }: { clearAll: () => Promise<void> }) {
  const onClear = () => {
    const ok = confirm(
      'This permanently erases ALL local data on this device — documents, boards, chat history, ' +
        'memory, and orchestrator sessions. Your theme preference is kept. This cannot be undone.\n\n' +
        'Clear all data?',
    )
    if (ok) void clearAll()
  }
  return (
    <div className="data-settings">
      <div className="data-settings__head">DATA</div>
      <p className="data-settings__desc">
        Everything lives locally in your browser — nothing is uploaded. Clearing wipes all documents,
        boards, chats, memory, and orchestrator sessions on this device (your theme preference is kept),
        then reloads a fresh workspace. This cannot be undone.
      </p>
      <button type="button" className="btn btn--danger" aria-label="clear all data" onClick={onClear}>
        Clear all data
      </button>
    </div>
  )
}

export function createDataSettingsModule(clearAll: () => Promise<void>): WorkspaceModule {
  return {
    id: 'data-settings',
    title: 'Data',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 20, collapsible: true, minSize: 12 },
    render: () => <DataPanel clearAll={clearAll} />,
    tools: [],
  }
}
