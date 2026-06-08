import { useState } from 'react'
import type { Card, CardType, ChecklistItem } from './types'

const TYPES: { value: CardType; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'note', label: 'Note' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'subboard', label: 'Sub-board' },
]

const itemId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const pad = (n: number) => String(n).padStart(2, '0')
const toDateInput = (ms?: number) => {
  if (!ms) return ''
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function CardEditor({
  card,
  onSave,
  onDelete,
  onClose,
}: {
  card: Card
  onSave: (patch: {
    title: string
    notes?: string
    type: CardType
    checklistItems: ChecklistItem[]
    dueAt?: number
  }) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(card.title)
  const [notes, setNotes] = useState(card.notes ?? '')
  const [type, setType] = useState<CardType>(card.type)
  const [items, setItems] = useState<ChecklistItem[]>(card.checklistItems ?? [])
  const [newItem, setNewItem] = useState('')
  const [due, setDue] = useState(toDateInput(card.dueAt))

  const save = () => {
    const t = title.trim()
    if (!t) return
    onSave({
      title: t,
      notes: notes.trim() || undefined,
      type,
      checklistItems: items,
      dueAt: due ? new Date(`${due}T00:00:00`).getTime() : undefined,
    })
    onClose()
  }

  const addItem = () => {
    const text = newItem.trim()
    if (!text) return
    setItems([...items, { id: itemId(), text, done: false }])
    setNewItem('')
  }

  return (
    <div className="kanban-modal" role="dialog" aria-label="Edit card" onClick={onClose}>
      <div className="kanban-modal__panel" onClick={(e) => e.stopPropagation()}>
        <label className="kanban-field">
          <span className="kanban-field__label">Title</span>
          <input
            className="kanban-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </label>
        <label className="kanban-field">
          <span className="kanban-field__label">Description</span>
          <textarea
            className="kanban-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Add a description…"
          />
        </label>
        <label className="kanban-field">
          <span className="kanban-field__label">Type</span>
          <select
            className="kanban-input"
            value={type}
            onChange={(e) => setType(e.target.value as CardType)}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="kanban-field">
          <span className="kanban-field__label">Due date</span>
          <input
            className="kanban-input"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            aria-label="Due date"
          />
        </label>

        {type === 'checklist' && (
          <div className="kanban-field">
            <span className="kanban-field__label">Checklist</span>
            <ul className="kanban-checklist">
              {items.map((it) => (
                <li key={it.id} className="kanban-checkitem">
                  <input
                    type="checkbox"
                    checked={it.done}
                    onChange={() =>
                      setItems(
                        items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)),
                      )
                    }
                  />
                  <span className={it.done ? 'kanban-checkitem__text done' : 'kanban-checkitem__text'}>
                    {it.text}
                  </span>
                  <button
                    className="kanban-checkitem__del"
                    onClick={() => setItems(items.filter((x) => x.id !== it.id))}
                    aria-label={`Remove ${it.text}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                addItem()
              }}
            >
              <input
                className="kanban-input"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="+ Add item"
                aria-label="New checklist item"
              />
            </form>
          </div>
        )}

        <div className="kanban-modal__actions">
          <button className="kanban-btn" onClick={save}>
            Save
          </button>
          <button className="kanban-back" onClick={onClose}>
            Cancel
          </button>
          <button
            className="kanban-modal__delete"
            onClick={() => {
              onDelete()
              onClose()
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
