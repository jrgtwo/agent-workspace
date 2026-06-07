import { useState } from 'react'
import type { BlockKind, InlineKind, MenuPick } from './milkdown/commands'
import './editorChrome.css'

const BLOCKS: Array<{ kind: BlockKind; label: string }> = [
  { kind: 'heading', label: 'Heading' },
  { kind: 'todo', label: 'To-do list' },
  { kind: 'code', label: 'Code block' },
  { kind: 'table', label: 'Table' },
  { kind: 'quote', label: 'Quote' },
  { kind: 'divider', label: 'Divider' },
]

export function EditorToolbar({ onCommand }: { onCommand: (pick: MenuPick) => void }) {
  const [open, setOpen] = useState(false)
  const block = (k: BlockKind) => { onCommand({ type: 'block', kind: k }); setOpen(false) }
  const inline = (k: InlineKind) => { onCommand({ type: 'inline', kind: k }) }
  return (
    <div className="toolbar">
      <button className="btn btn--icon" aria-label="Bold" onClick={() => inline('strong')}><b>B</b></button>
      <button className="btn btn--icon" aria-label="Italic" onClick={() => inline('em')}><i>I</i></button>
      <button className="btn btn--icon" aria-label="Inline code" onClick={() => inline('code')}>{'</>'}</button>
      <button className="btn btn--icon" aria-label="Link" onClick={() => inline('link')}>🔗</button>
      <span className="toolbar__divider" />
      <button className="btn btn--icon" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>Insert ▾</button>
      {open && (
        <div role="menu" className="menu menu--popover">
          {BLOCKS.map((b) => (
            <div key={b.kind} role="menuitem" className="menu__item" tabIndex={0} onClick={() => block(b.kind)}>{b.label}</div>
          ))}
        </div>
      )}
    </div>
  )
}
