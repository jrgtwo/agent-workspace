import type { BlockKind, InlineKind, MenuPick } from './milkdown/commands'
import './editorChrome.css'

// Re-export so existing call sites that imported MenuPick from here continue to work.
export type { MenuPick }

const FORMAT: Array<{ kind: InlineKind; label: string }> = [
  { kind: 'strong', label: 'Bold' },
  { kind: 'em', label: 'Italic' },
  { kind: 'code', label: 'Inline code' },
  { kind: 'link', label: 'Link' },
]
const BLOCKS: Array<{ kind: BlockKind; label: string }> = [
  { kind: 'heading', label: 'Heading' },
  { kind: 'todo', label: 'To-do list' },
  { kind: 'code', label: 'Code block' },
  { kind: 'table', label: 'Table' },
  { kind: 'quote', label: 'Quote' },
  { kind: 'divider', label: 'Divider' },
]

export function EditorContextMenu({ x, y, hasSelection, onPick, onClose }: {
  x: number; y: number; hasSelection: boolean
  onPick: (p: MenuPick) => void; onClose: () => void
}) {
  const items: Array<{ label: string; pick: MenuPick }> = hasSelection
    ? FORMAT.map((f) => ({ label: f.label, pick: { type: 'inline', kind: f.kind } }))
    : BLOCKS.map((b) => ({ label: b.label, pick: { type: 'block', kind: b.kind } }))
  return (
    <div
      role="menu"
      onMouseLeave={onClose}
      className="menu menu--context"
      style={{ top: y, left: x }}
    >
      {items.map((it) => (
        <div key={it.label} role="menuitem" className="menu__item" tabIndex={0} onClick={() => { onPick(it.pick); onClose() }}>{it.label}</div>
      ))}
    </div>
  )
}
