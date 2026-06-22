import { useState } from 'react'
import { useStore } from '../core/emitter'
import type { OrchestratorSessionStore } from '../modules/orchestrator/sessionStore'

export function DockSessionMenu({ store }: { store: OrchestratorSessionStore }) {
  const { sessions, activeId } = useStore(store)
  const [open, setOpen] = useState(false)
  const active = sessions.find((s) => s.id === activeId)

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
              <button
                className={`dock-sessions__item${s.id === activeId ? ' dock-sessions__item--active' : ''}`}
                onClick={() => { void store.setActive(s.id); setOpen(false) }}
              >{s.title}</button>
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
