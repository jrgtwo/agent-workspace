import type { Card, Project } from './types'

/** Breadcrumb trail: project › ancestor sub-boards › current. The last crumb is the current board. */
export function Breadcrumb({
  project,
  trail,
  onProject,
  onCard,
}: {
  project: Project
  trail: Card[] // ancestor sub-board cards, root→current
  onProject: () => void
  onCard: (card: Card) => void
}) {
  return (
    <nav className="kanban-crumbs" aria-label="Breadcrumb">
      {trail.length === 0 ? (
        <span className="kanban-crumb kanban-crumb--current">{project.name}</span>
      ) : (
        <button className="kanban-crumb" onClick={onProject}>
          {project.name}
        </button>
      )}
      {trail.map((card, i) => {
        const isLast = i === trail.length - 1
        return (
          <span key={card.id} className="kanban-crumb-group">
            <span className="kanban-crumb-sep">›</span>
            {isLast ? (
              <span className="kanban-crumb kanban-crumb--current">{card.title}</span>
            ) : (
              <button className="kanban-crumb" onClick={() => onCard(card)}>
                {card.title}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
