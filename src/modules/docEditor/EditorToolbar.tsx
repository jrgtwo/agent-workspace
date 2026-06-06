import { useState } from 'react'
import type { BlockKind, InlineKind, MenuPick } from './milkdown/commands'

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
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #eee', background: '#fcfcfd', fontSize: 12, position: 'relative' }}>
      <button aria-label="Bold" onClick={() => inline('strong')}><b>B</b></button>
      <button aria-label="Italic" onClick={() => inline('em')}><i>I</i></button>
      <button aria-label="Inline code" onClick={() => inline('code')}>{'</>'}</button>
      <button aria-label="Link" onClick={() => inline('link')}>🔗</button>
      <span style={{ width: 1, height: 16, background: '#e0e0e6' }} />
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>Insert ▾</button>
      {open && (
        <div role="menu" style={{ position: 'absolute', top: '100%', left: 120, background: '#fff', border: '1px solid #e0e0e6', borderRadius: 8, boxShadow: '0 6px 22px rgba(0,0,0,.16)', padding: 5, zIndex: 5, width: 170 }}>
          {BLOCKS.map((b) => (
            <div key={b.kind} role="menuitem" tabIndex={0} onClick={() => block(b.kind)} style={{ padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }}>{b.label}</div>
          ))}
        </div>
      )}
    </div>
  )
}
