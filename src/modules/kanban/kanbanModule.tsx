import type { WorkspaceModule } from '../../core/types'
import type { CardType, CreateCardEntry, KanbanProposalPayload } from './types'
import type { KanbanStore } from './kanbanStore'
import type { KanbanNavStore } from './kanbanNavStore'
import type { ProposalStore } from '../../core/proposalStore'
import type { ProposalApplier } from '../../core/proposalApplier'
import { KanbanApp } from './KanbanApp'

const NO_BOARD = { ok: false as const, message: 'No board is open. Open a board first.' }

export function createKanbanModule(store: KanbanStore, nav: KanbanNavStore, proposals: ProposalStore, applier: ProposalApplier): WorkspaceModule {
  const resource = 'kanban-board'

  return {
    id: 'kanban-board',
    title: 'Board',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 68, collapsible: false, minSize: 30 },
    render: () => <KanbanApp store={store} nav={nav} proposals={proposals} applier={applier} />,
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
        name: 'create_cards',
        description:
          'Propose adding one or MORE cards to the currently-open board in a SINGLE call (shown as one ' +
          'pending change awaiting the user\'s review, applied together). Gather ALL the cards you want ' +
          'and call this ONCE — do not call it repeatedly. Each card names its own column. Use list_board ' +
          'first to see the column names.',
        parameters: {
          type: 'object',
          properties: {
            cards: {
              type: 'array',
              description: 'The cards to add — pass the full list in one call.',
              items: {
                type: 'object',
                properties: {
                  columnName: { type: 'string', description: 'Target column name (case-insensitive).' },
                  title: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: ['task', 'note', 'checklist', 'milestone', 'subboard'],
                    description: 'Card type (default task). A "subboard" card holds its own nested board.',
                  },
                  notes: { type: 'string' },
                },
                required: ['columnName', 'title'],
              },
            },
          },
          required: ['cards'],
        },
        handler: (a: { cards?: Array<{ columnName: string; title: string; type?: CardType; notes?: string }> }) => {
          const scope = nav.activeScope()
          if (!scope) return NO_BOARD
          const list = Array.isArray(a?.cards) ? a.cards : []
          if (!list.length) return { ok: false, error: '`cards` must be a non-empty array.' }
          const cols = store.columnsForScope(scope)

          // Titles already PENDING per column (loop guard — pending-only, so committed/legit duplicate
          // titles are fine; the model just can't see its own pending proposals in the board snapshot).
          const pendingByCol = new Map<string, Set<string>>()
          for (const c of proposals.forModule('kanban-board')) {
            const p = c.payload as KanbanProposalPayload
            if (p.kind !== 'create-cards') continue
            for (const card of p.cards) {
              const set = pendingByCol.get(card.columnId) ?? new Set<string>()
              set.add(card.input.title.trim().toLowerCase())
              pendingByCol.set(card.columnId, set)
            }
          }

          const resolved: CreateCardEntry[] = []
          const seenInBatch = new Map<string, Set<string>>()
          const skipped: string[] = []
          for (const card of list) {
            const title = String(card?.title ?? '').trim()
            if (!title) { skipped.push('(blank title)'); continue }
            const col = cols.find((c) => c.name.toLowerCase() === String(card?.columnName ?? '').toLowerCase())
            if (!col) { skipped.push(`"${title}" (no column "${card?.columnName}")`); continue }
            const key = title.toLowerCase()
            const inBatch = seenInBatch.get(col.id) ?? new Set<string>()
            if (inBatch.has(key) || pendingByCol.get(col.id)?.has(key)) {
              skipped.push(`"${title}" (already ${inBatch.has(key) ? 'in this batch' : 'pending'})`)
              continue
            }
            inBatch.add(key); seenInBatch.set(col.id, inBatch)
            resolved.push({ scope, columnId: col.id, input: { title, notes: card.notes, type: card.type } })
          }

          if (!resolved.length) {
            return { ok: true, proposed: false, skipped, message: `No cards to add — all ${list.length} were duplicates or had an unknown column.` }
          }
          const board = store.getProject(scope.projectId)?.name ?? 'board'
          const titles = resolved.map((r) => r.input.title)
          proposals.propose({
            moduleId: 'kanban-board',
            summary: `Add ${resolved.length} card${resolved.length === 1 ? '' : 's'} to ${board}: ${titles.join(', ')}`,
            payload: { kind: 'create-cards', cards: resolved },
          })
          return {
            proposed: true,
            count: resolved.length,
            ...(skipped.length ? { skipped } : {}),
            message: `Proposed ${resolved.length} card${resolved.length === 1 ? '' : 's'}; awaiting your review.${skipped.length ? ` Skipped ${skipped.length}.` : ''}`,
          }
        },
      },
      {
        name: 'move_card',
        description:
          'Propose moving a card to a different column on the currently-open board (shown as a ' +
          'pending change awaiting your review). Identify the card by its id (from list_board) or its exact title.',
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
        handler: (a: { cardId?: string; cardTitle?: string; toColumnName: string; toIndex?: number }) => {
          const scope = nav.activeScope()
          if (!scope) return NO_BOARD
          const boardCards = store.cardsForScope(scope)
          let card = a.cardId ? boardCards.find((c) => c.id === a.cardId) : undefined
          if (!card && a.cardTitle) {
            const matches = boardCards.filter((c) => c.title.toLowerCase() === String(a.cardTitle).toLowerCase())
            if (matches.length > 1) return { ok: false, error: `Multiple cards titled "${a.cardTitle}". Use cardId.` }
            card = matches[0]
          }
          if (!card) return { ok: false, error: 'Card not found on the active board.' }
          const cols = store.columnsForScope(scope)
          const col = cols.find((c) => c.name.toLowerCase() === String(a.toColumnName ?? '').toLowerCase())
          if (!col) return { ok: false, error: `No column named "${a.toColumnName}". Columns: ${cols.map((c) => c.name).join(', ')}.` }
          const index = typeof a.toIndex === 'number' ? a.toIndex : store.cardsInColumn(col.id).length
          proposals.propose({
            moduleId: 'kanban-board',
            summary: `Move "${card.title}" to ${col.name}`,
            payload: { kind: 'move-card', cardId: card.id, toColumnId: col.id, toIndex: index },
          })
          return { proposed: true, message: `Proposed moving "${card.title}" → ${col.name}; awaiting your review.` }
        },
      },
      {
        name: 'create_board',
        description:
          'Propose creating a new board (a project) with the default columns (Backlog, In Progress, ' +
          'Review, Done), shown as a pending change awaiting your review.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string', description: 'Optional subtitle shown under the board name.' },
          },
          required: ['name'],
        },
        handler: (a: { name: string; description?: string }) => {
          const name = a.name?.trim()
          if (!name) return { ok: false, error: '`name` is required.' }
          proposals.propose({
            moduleId: 'kanban-project',
            summary: `Create board "${name}"`,
            payload: { name, description: a.description },
          })
          return { proposed: true, message: `Proposed new board "${name}"; awaiting your review.` }
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
