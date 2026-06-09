import type { WorkspaceModule } from '../../core/types'
import type { CardType } from './types'
import type { KanbanStore } from './kanbanStore'
import type { KanbanNavStore } from './kanbanNavStore'
import { KanbanApp } from './KanbanApp'

const NO_BOARD = { ok: false as const, message: 'No board is open. Open a board first.' }

export function createKanbanModule(store: KanbanStore, nav: KanbanNavStore): WorkspaceModule {
  const resource = 'kanban-board'

  return {
    id: 'kanban-board',
    title: 'Board',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 68, collapsible: false, minSize: 30 },
    render: () => <KanbanApp store={store} nav={nav} />,
    tools: [
      {
        name: 'list_board',
        description:
          'List the columns and cards on the currently-open kanban board. Returns nothing useful ' +
          'if no board is open (the user is on the boards list).',
        parameters: { type: 'object', properties: {} },
        permission: {
          kind: 'read',
          resource,
          locality: 'LOCAL',
          describe: () => 'Read the active kanban board?',
        },
        handler: () => {
          const scope = nav.activeScope()
          if (!scope) return NO_BOARD
          const project = store.getProject(scope.projectId)
          const columns = store.columnsForScope(scope).map((col) => ({
            column: col.name,
            cards: store.cardsInColumn(col.id).map((c) => ({
              id: c.id,
              title: c.title,
              type: c.type,
            })),
          }))
          return { ok: true, board: project?.name, columns }
        },
      },
      {
        name: 'create_card',
        description:
          'Add a card to a named column on the currently-open board. Use list_board first to see ' +
          'the column names.',
        parameters: {
          type: 'object',
          properties: {
            columnName: { type: 'string', description: 'Target column name (case-insensitive).' },
            title: { type: 'string' },
            type: {
              type: 'string',
              enum: ['task', 'note', 'checklist', 'milestone', 'subboard'],
              description:
                'Card type (default task). A "subboard" card holds its own nested board, opened from the card. After creating a subboard card, call open_board with subboard:<title> to add cards inside it.',
            },
            notes: { type: 'string' },
          },
          required: ['columnName', 'title'],
        },
        permission: {
          kind: 'write',
          resource,
          locality: 'LOCAL',
          describe: (a) => {
            const { title, columnName } = a as { title?: string; columnName?: string }
            return `Add card "${title}" to ${columnName}?`
          },
        },
        handler: (a: { columnName: string; title: string; type?: CardType; notes?: string }) => {
          const scope = nav.activeScope()
          if (!scope) return NO_BOARD
          if (!a.title?.trim()) return { ok: false, error: '`title` is required.' }
          const cols = store.columnsForScope(scope)
          const col = cols.find(
            (c) => c.name.toLowerCase() === String(a.columnName ?? '').toLowerCase(),
          )
          if (!col) {
            return {
              ok: false,
              error: `No column named "${a.columnName}". Columns: ${cols.map((c) => c.name).join(', ')}.`,
            }
          }
          const id = store.createCard(scope, col.id, {
            title: a.title.trim(),
            notes: a.notes,
            type: a.type,
          })
          // Seed a sub-board's columns up front so it's usable as soon as it's opened.
          if (a.type === 'subboard') {
            store.ensureBoardColumns({ projectId: scope.projectId, parentCardId: id })
          }
          return { ok: true, id, message: `Added "${a.title.trim()}" to ${col.name}.` }
        },
      },
      {
        name: 'move_card',
        description:
          'Move a card to a different column on the currently-open board. Identify the card by its ' +
          'id (from list_board) or its exact title.',
        parameters: {
          type: 'object',
          properties: {
            cardId: { type: 'string' },
            cardTitle: { type: 'string', description: 'Exact card title (used if cardId is omitted).' },
            toColumnName: { type: 'string', description: 'Destination column name (case-insensitive).' },
            toIndex: { type: 'number', description: 'Optional position within the column (default end).' },
          },
          required: ['toColumnName'],
        },
        permission: {
          kind: 'write',
          resource,
          locality: 'LOCAL',
          describe: (a) => {
            const { cardTitle, cardId, toColumnName } = a as {
              cardTitle?: string
              cardId?: string
              toColumnName?: string
            }
            return `Move card ${cardTitle ?? cardId} to ${toColumnName}?`
          },
        },
        handler: (a: {
          cardId?: string
          cardTitle?: string
          toColumnName: string
          toIndex?: number
        }) => {
          const scope = nav.activeScope()
          if (!scope) return NO_BOARD
          const boardCards = store.cardsForScope(scope)
          let card = a.cardId ? boardCards.find((c) => c.id === a.cardId) : undefined
          if (!card && a.cardTitle) {
            const matches = boardCards.filter(
              (c) => c.title.toLowerCase() === String(a.cardTitle).toLowerCase(),
            )
            if (matches.length > 1) {
              return { ok: false, error: `Multiple cards titled "${a.cardTitle}". Use cardId.` }
            }
            card = matches[0]
          }
          if (!card) return { ok: false, error: 'Card not found on the active board.' }
          const cols = store.columnsForScope(scope)
          const col = cols.find(
            (c) => c.name.toLowerCase() === String(a.toColumnName ?? '').toLowerCase(),
          )
          if (!col) {
            return {
              ok: false,
              error: `No column named "${a.toColumnName}". Columns: ${cols.map((c) => c.name).join(', ')}.`,
            }
          }
          const index =
            typeof a.toIndex === 'number' ? a.toIndex : store.cardsInColumn(col.id).length
          store.moveCard(card.id, col.id, index)
          return { ok: true, message: `Moved "${card.title}" to ${col.name}.` }
        },
      },
      {
        name: 'create_board',
        description:
          'Create a new board (a project) with the default columns (Backlog, In Progress, Review, ' +
          'Done). Does NOT navigate to it; the user opens it from the boards list.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string', description: 'Optional subtitle shown under the board name.' },
          },
          required: ['name'],
        },
        permission: {
          kind: 'write',
          // Distinct from the open-board 'kanban-board' resource: this creates a NEW board.
          resource: 'board:new',
          locality: 'LOCAL',
          describe: (a) => `Create a new board "${(a as { name?: string }).name}"?`,
        },
        handler: (a: { name: string; description?: string }) => {
          const name = a.name?.trim()
          if (!name) return { ok: false, error: '`name` is required.' }
          const id = store.createProject({ name, description: a.description })
          return { ok: true, id, message: `Created board "${name}".` }
        },
      },
      {
        name: 'open_board',
        description:
          'Open (navigate to) a board so subsequent create_card/list_board/move_card act on it. ' +
          'Open a root board by `name` or `projectId`. To work INSIDE a sub-board (a card of type ' +
          'subboard), pass `subboard` = that card\'s title — you MUST open a sub-board before adding ' +
          'cards to it.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Root board name (case-insensitive).' },
            projectId: { type: 'string' },
            subboard: { type: 'string', description: 'Title of a sub-board card to open, so you can add cards INSIDE it (case-insensitive).' },
          },
        },
        // Navigation only (no data read/write) → no permission gate.
        handler: (a: { name?: string; projectId?: string; subboard?: string }) => {
          if (a.subboard) {
            const target = String(a.subboard).toLowerCase()
            const matches = store.getState().cards.filter((c) => c.type === 'subboard' && c.title.toLowerCase() === target)
            if (matches.length === 0) {
              const names = store.getState().cards.filter((c) => c.type === 'subboard').map((c) => c.title)
              return { ok: false, error: `No sub-board named "${a.subboard}". Sub-boards: ${names.join(', ') || '(none)'}.` }
            }
            if (matches.length > 1) {
              return { ok: false, error: `Multiple sub-boards titled "${a.subboard}". Rename one to disambiguate.` }
            }
            const card = matches[0]
            nav.openBoard({ projectId: card.projectId, parentCardId: card.id })
            return { ok: true, board: card.title }
          }
          const projects = store.getState().projects
          const project = a.projectId
            ? projects.find((p) => p.id === a.projectId)
            : projects.find((p) => p.name.toLowerCase() === String(a.name ?? '').toLowerCase())
          if (!project) {
            return { ok: false, error: `No board named "${a.name ?? a.projectId}". Boards: ${projects.map((p) => p.name).join(', ') || '(none)'}.` }
          }
          nav.openBoard({ projectId: project.id })
          return { ok: true, board: project.name }
        },
      },
    ],
  }
}
