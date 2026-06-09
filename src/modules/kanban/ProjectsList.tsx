import { useState } from 'react'
import { useStore } from '../../core/emitter'
import type { KanbanStore } from './kanbanStore'
import type { KanbanNavStore } from './kanbanNavStore'
import type { ProposalStore } from '../../core/proposalStore'
import type { ProposalApplier } from '../../core/proposalApplier'
import { PendingReview } from '../proposals/PendingReview'

export function ProjectsList({ store, nav, proposals, applier }: { store: KanbanStore; nav: KanbanNavStore; proposals: ProposalStore; applier: ProposalApplier }) {
  const { projects, cards } = useStore(store)
  const [name, setName] = useState('')

  const create = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const id = store.createProject({ name: trimmed })
    setName('')
    nav.openBoard({ projectId: id })
  }

  return (
    <div className="kanban-projects">
      <PendingReview proposals={proposals} applier={applier} moduleId="kanban-project" />
      <header className="kanban-projects__head">
        <h2 className="kanban-projects__title">Boards</h2>
      </header>

      <form
        className="kanban-newproject"
        onSubmit={(e) => {
          e.preventDefault()
          create()
        }}
      >
        <input
          className="kanban-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New board name…"
          aria-label="New board name"
        />
        <button className="kanban-btn" type="submit">
          Create
        </button>
      </form>

      {projects.length === 0 ? (
        <p className="kanban-empty">No boards yet — create your first one above.</p>
      ) : (
        <ul className="kanban-projectgrid">
          {projects.map((p) => {
            const count = cards.filter((c) => c.projectId === p.id && !c.parentCardId).length
            return (
              <li key={p.id}>
                <button
                  className="kanban-projectcard"
                  data-accent={p.accent}
                  onClick={() => nav.openBoard({ projectId: p.id })}
                >
                  <span className="kanban-projectcard__sigil">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="kanban-projectcard__name">{p.name}</span>
                  <span className="kanban-projectcard__count">
                    {count} {count === 1 ? 'card' : 'cards'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
