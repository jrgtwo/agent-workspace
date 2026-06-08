import type { DragEvent } from 'react'
import type { KanbanStore } from './kanbanStore'
import type { Card } from './types'

const TYPE_LABEL: Record<string, string> = {
  subboard: '▦ sub-board',
  note: 'note',
  checklist: 'checklist',
  milestone: 'milestone',
}

/**
 * A draggable card. Drag/drop uses native HTML5 DnD (no dependency) — consistent with the app's
 * custom-drag approach. Clicking the card opens the editor; dropping onto another card inserts the
 * dragged card before it (the column handles drop-to-append).
 */
export function KanbanCard({
  card,
  store,
  onEdit,
  onOpenSubBoard,
  onDelete,
}: {
  card: Card
  store: KanbanStore
  onEdit: () => void
  onOpenSubBoard: () => void
  onDelete: () => void
}) {
  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('application/kanban-card', card.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation() // don't also trigger the column's append-drop
    const draggedId = e.dataTransfer.getData('application/kanban-card')
    if (!draggedId || draggedId === card.id) return
    const list = store.cardsInColumn(card.columnId).filter((c) => c.id !== draggedId)
    const index = list.findIndex((c) => c.id === card.id)
    store.moveCard(draggedId, card.columnId, index < 0 ? list.length : index)
  }

  return (
    <article
      className="kanban-card"
      data-type={card.type}
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={onEdit}
    >
      {card.type !== 'task' && <span className="kanban-card__badge">{TYPE_LABEL[card.type]}</span>}
      <p className="kanban-card__title">{card.title}</p>
      {card.notes ? <p className="kanban-card__notes">{card.notes}</p> : null}
      {card.type === 'checklist' && card.checklistItems && card.checklistItems.length > 0 && (
        <div className="kanban-checklist-mini" onClick={(e) => e.stopPropagation()}>
          <span className="kanban-checklist-mini__count">
            {card.checklistItems.filter((i) => i.done).length}/{card.checklistItems.length}
          </span>
          <ul>
            {card.checklistItems.map((it) => (
              <li key={it.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={it.done}
                    onChange={() => store.toggleChecklistItem(card.id, it.id)}
                  />
                  <span className={it.done ? 'done' : undefined}>{it.text}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
      {card.dueAt && (
        <span
          className="kanban-card__due"
          data-overdue={Date.now() > card.dueAt || undefined}
        >
          due {new Date(card.dueAt).toLocaleDateString()}
        </span>
      )}
      {card.type === 'subboard' && (
        <button
          className="kanban-card__open"
          onClick={(e) => {
            e.stopPropagation()
            onOpenSubBoard()
          }}
        >
          Open board →
        </button>
      )}
      <button
        className="kanban-card__del"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        aria-label="Delete card"
        title="Delete card"
      >
        ×
      </button>
    </article>
  )
}
