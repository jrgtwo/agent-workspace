import { useState } from 'react'
import { useStore } from '../core/emitter'
import type { OrchestratorSessionStore } from '../modules/orchestrator/sessionStore'

export function DockSessionMenu({ store }: { store: OrchestratorSessionStore }) {
  const { sessions, activeId } = useStore(store)
  const [open, setOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const active = sessions.find((s) => s.id === activeId)

  const commitRename = () => {
    if (renamingId && draft.trim()) void store.rename(renamingId, draft.trim())
    setRenamingId(null)
  }

  return (
    <div className="dock-sessions">
      <button className="dock-sessions__current" aria-label="conversations" aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((o) => !o)}>
        {active?.title ?? 'Conversations'} ▾
      </button>
      <button className="dock-sessions__new btn btn--icon" aria-label="new conversation" onClick={() => void store.create()}>+ New</button>
      {open && (
        <ul className="dock-sessions__list">
          {sessions.map((s) => (
            <li key={s.id} className="dock-sessions__row">
              {renamingId === s.id ? (
                <input
                  autoFocus
                  aria-label="rename conversation"
                  className="dock-sessions__rename"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename() }}
                />
              ) : (
                <button
                  className={`dock-sessions__item${s.id === activeId ? ' dock-sessions__item--active' : ''}`}
                  onClick={() => { void store.setActive(s.id); setOpen(false) }}
                  onDoubleClick={() => { setRenamingId(s.id); setDraft(s.title) }}
                >{s.title}</button>
              )}
              <button
                aria-label={`delete ${s.title}`}
                className="btn btn--icon btn--danger"
                onClick={() => { if (confirm(`Delete "${s.title}"?`)) void store.delete(s.id) }}
              >✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
