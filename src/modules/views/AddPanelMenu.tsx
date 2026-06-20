// src/modules/views/AddPanelMenu.tsx
import { useState } from 'react'
import type { PanelRegistry } from '../../core/panelRegistry'

export function AddPanelMenu({ registry, present, onAdd }: { registry: PanelRegistry; present: string[]; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const choices = [...registry.values()].filter((t) => !present.includes(t.id))
  return (
    <div className="views-addmenu">
      <button type="button" className="views-addmenu__btn" onClick={() => setOpen((o) => !o)}>＋ Add panel ▾</button>
      {open && (
        <div className="views-addmenu__list" role="menu">
          {choices.map((t) => (
            <button key={t.id} type="button" role="menuitem" onClick={() => { onAdd(t.id); setOpen(false) }}>
              {t.icon} {t.label}
            </button>
          ))}
          {choices.length === 0 && <span className="views-addmenu__empty">All panels added</span>}
        </div>
      )}
    </div>
  )
}
