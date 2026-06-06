import type { BlockKind, InlineKind, MenuPick } from './milkdown/commands'

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
      style={{ position: 'fixed', top: y, left: x, background: '#fff', border: '1px solid #e0e0e6', borderRadius: 8, boxShadow: '0 6px 22px rgba(0,0,0,.16)', padding: 5, zIndex: 50, width: 170, fontSize: 13 }}
    >
      {items.map((it) => (
        <div key={it.label} role="menuitem" tabIndex={0} onClick={() => { onPick(it.pick); onClose() }} style={{ padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }}>{it.label}</div>
      ))}
    </div>
  )
}
