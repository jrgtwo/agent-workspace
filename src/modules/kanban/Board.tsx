import { useState } from 'react'
import { useStore } from '../../core/emitter'
import type { KanbanStore } from './kanbanStore'
import type { KanbanNavStore } from './kanbanNavStore'
import type { Card, Scope } from './types'
import { BoardColumn } from './BoardColumn'
import { AddColumn } from './AddColumn'
import { Breadcrumb } from './Breadcrumb'
import { CardEditor } from './CardEditor'

export function Board({
  store,
  nav,
  scope,
}: {
  store: KanbanStore
  nav: KanbanNavStore
  scope: Scope
}) {
  useStore(store) // re-render on any board change
  const [editingId, setEditingId] = useState<string | null>(null)

  const project = store.getProject(scope.projectId)
  const columns = store.columnsForScope(scope)
  const trail = store.ancestorCards(scope)
  const editingCard = editingId ? store.getCard(editingId) ?? null : null

  const openSubBoard = (card: Card) => {
    const sub: Scope = { projectId: scope.projectId, parentCardId: card.id }
    store.ensureBoardColumns(sub)
    nav.openBoard(sub)
  }

  if (!project) {
    return (
      <div className="kanban-board">
        <header className="kanban-board__head">
          <button className="kanban-back" onClick={() => nav.openProjects()}>
            ← Boards
          </button>
        </header>
        <p className="kanban-empty">Board not found.</p>
      </div>
    )
  }

  return (
    <div className="kanban-board">
      <header className="kanban-board__head">
        <button className="kanban-back" onClick={() => nav.openProjects()}>
          ← Boards
        </button>
        <Breadcrumb
          project={project}
          trail={trail}
          onProject={() => nav.openBoard({ projectId: scope.projectId })}
          onCard={(c) => nav.openBoard({ projectId: scope.projectId, parentCardId: c.id })}
        />
      </header>
      <div className="kanban-columns">
        {columns.map((col) => (
          <BoardColumn
            key={col.id}
            store={store}
            scope={scope}
            column={col}
            onEditCard={setEditingId}
            onOpenSubBoard={openSubBoard}
          />
        ))}
        <AddColumn onAdd={(name) => store.createColumn(scope, name)} />
      </div>
      {editingCard && (
        <CardEditor
          card={editingCard}
          onSave={(patch) => store.updateCard(editingCard.id, patch)}
          onDelete={() => store.deleteCard(editingCard.id)}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  )
}
