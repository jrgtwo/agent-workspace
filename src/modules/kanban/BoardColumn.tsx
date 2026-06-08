import { useState } from 'react'
import type { DragEvent } from 'react'
import type { KanbanStore } from './kanbanStore'
import type { Card, Column, Scope } from './types'
import { KanbanCard } from './CardItem'
import { NewCardInput } from './NewCardInput'

const CARD = 'application/kanban-card'
const COLUMN = 'application/kanban-column'

export function BoardColumn({
  store,
  scope,
  column,
  onEditCard,
  onOpenSubBoard,
}: {
  store: KanbanStore
  scope: Scope
  column: Column
  onEditCard: (cardId: string) => void
  onOpenSubBoard: (card: Card) => void
}) {
  const cards = store.cardsInColumn(column.id)
  const [over, setOver] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(column.name)

  const onCardDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOver(false)
    const draggedId = e.dataTransfer.getData(CARD)
    if (!draggedId) return
    // Drop on the column body = append to the end (card-level drops handle insert-before).
    const list = store.cardsInColumn(column.id).filter((c) => c.id !== draggedId)
    store.moveCard(draggedId, column.id, list.length)
  }

  const onColumnDrop = (e: DragEvent) => {
    e.preventDefault()
    const draggedColId = e.dataTransfer.getData(COLUMN)
    if (!draggedColId || draggedColId === column.id) return
    const ids = store
      .columnsForScope(scope)
      .map((c) => c.id)
      .filter((id) => id !== draggedColId)
    const targetIdx = ids.indexOf(column.id)
    ids.splice(targetIdx < 0 ? ids.length : targetIdx, 0, draggedColId)
    store.reorderColumns(ids)
  }

  const commitRename = () => {
    const n = name.trim()
    if (n && n !== column.name) store.renameColumn(column.id, n)
    else setName(column.name)
    setRenaming(false)
  }

  return (
    <section className="kanban-column" data-over={over || undefined}>
      <header
        className="kanban-column__head"
        draggable={!renaming}
        onDragStart={(e) => {
          e.dataTransfer.setData(COLUMN, column.id)
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(COLUMN)) e.preventDefault()
        }}
        onDrop={onColumnDrop}
      >
        {renaming ? (
          <input
            className="kanban-col-rename"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') {
                setName(column.name)
                setRenaming(false)
              }
            }}
            aria-label="Column name"
          />
        ) : (
          <span
            className="kanban-column__name"
            onDoubleClick={() => {
              setName(column.name)
              setRenaming(true)
            }}
            title="Double-click to rename"
          >
            {column.name}
          </span>
        )}
        <span className="kanban-column__count">{cards.length}</span>
        <button
          className="kanban-column__del"
          draggable={false}
          aria-label={`Delete column ${column.name}`}
          title="Delete column and its cards"
          onClick={() => store.deleteColumn(column.id)}
        >
          ×
        </button>
      </header>
      <div
        className="kanban-column__cards"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(CARD)) {
            e.preventDefault()
            e.stopPropagation()
            setOver(true)
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onCardDrop}
      >
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            store={store}
            onEdit={() => onEditCard(card.id)}
            onOpenSubBoard={() => onOpenSubBoard(card)}
            onDelete={() => store.deleteCard(card.id)}
          />
        ))}
      </div>
      <NewCardInput onAdd={(title) => store.createCard(scope, column.id, { title })} />
    </section>
  )
}
