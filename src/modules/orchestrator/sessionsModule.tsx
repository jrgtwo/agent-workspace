import { useState } from 'react'
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { OrchestratorSessionStore } from './sessionStore'
import './orchestrator.css'

function SessionsPanel({ store }: { store: OrchestratorSessionStore }) {
  const { sessions, activeId } = useStore(store)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const commitRename = () => {
    if (renamingId && draft.trim()) void store.rename(renamingId, draft.trim())
    setRenamingId(null)
  }

  return (
    <div className="sessions">
      <div className="sessions__head">
        <span className="sessions__title">CONVERSATIONS</span>
        <button aria-label="create conversation" className="btn btn--icon" style={{ marginLeft: 'auto' }} onClick={() => void store.create()}>+ New</button>
      </div>
      <div className="sessions__list">
        {sessions.map((s) => (
          <div key={s.id} className="sessions__row">
            {renamingId === s.id ? (
              <input
                autoFocus
                aria-label="rename conversation"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => { if (e.key === 'Enter') commitRename() }}
                className="sessions__item"
              />
            ) : (
              <button
                onClick={() => void store.setActive(s.id)}
                onDoubleClick={() => { setRenamingId(s.id); setDraft(s.title) }}
                className={`sessions__item${s.id === activeId ? ' sessions__item--active' : ''}`}
              >
                {s.title}
              </button>
            )}
            <button
              aria-label={`delete ${s.title}`}
              className="btn btn--icon btn--danger"
              onClick={() => { if (confirm(`Delete "${s.title}"?`)) void store.delete(s.id) }}
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function createSessionsModule(store: OrchestratorSessionStore): WorkspaceModule {
  return {
    id: 'orchestrator-sessions',
    title: 'Conversations',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 18, collapsible: true, minSize: 12 },
    render: () => <SessionsPanel store={store} />,
    tools: [],
  }
}
