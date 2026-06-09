import type { KanbanStore } from './kanbanStore'
import type { KanbanNavStore } from './kanbanNavStore'

/**
 * A one-shot, plain-text snapshot of the kanban board the agent is looking at, injected into the
 * system prompt each run so the model knows what's open (and which sub-boards exist) instead of
 * guessing. Read-only; cheap; recomputed per run.
 */
export function describeKanbanContext(store: KanbanStore, nav: KanbanNavStore): string {
  const scope = nav.activeScope()
  const { projects } = store.getState()

  if (!scope) {
    if (!projects.length) return 'Kanban: no boards exist yet. Use create_board to make one.'
    const names = projects.map((p) => `"${p.name}"`).join(', ')
    return (
      `Kanban: you are on the boards list — no board is open. Existing boards: ${names}. ` +
      'To act on a board, open it with open_board (or make a new one with create_board).'
    )
  }

  const project = store.getProject(scope.projectId)
  const ancestors = store.ancestorCards(scope)
  const crumb = [project?.name ?? 'board', ...ancestors.map((c) => c.title)].join(' ▸ ')
  const columns = store.columnsForScope(scope)
  const colSummary = columns.map((c) => `${c.name} (${store.cardsInColumn(c.id).length})`).join(', ')
  const subboards = columns
    .flatMap((c) => store.cardsInColumn(c.id))
    .filter((c) => c.type === 'subboard')
    .map((c) => c.title)

  const lines = [
    `Kanban: open board = "${crumb}"${scope.parentCardId ? ' (a sub-board)' : ''}.`,
    `Columns: ${colSummary || '(none)'}.`,
  ]
  if (subboards.length) {
    lines.push(
      `Sub-boards on this board: ${subboards.map((t) => `"${t}"`).join(', ')}. ` +
        'To add cards INSIDE one, call open_board with subboard:"<title>" first.',
    )
  }
  return lines.join('\n')
}
