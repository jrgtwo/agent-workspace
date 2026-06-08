// Kanban data model — ported from the standalone kanban app (db/types.ts), adapted to live in
// this app's in-memory Emitter store (no Dexie). A board is identified by a Scope.

export type CardType = 'task' | 'subboard' | 'note' | 'checklist' | 'milestone'

// Per-project accent (kept from the kanban app for visual variety). Mapped onto this app's
// design tokens in kanban.css, so it themes with the rest of the workspace.
export type Accent = 'vermillion' | 'ochre' | 'moss' | 'ink'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Project {
  id: string
  name: string
  description?: string
  accent: Accent
  createdAt: number
}

export interface Column {
  id: string
  projectId: string
  parentCardId?: string // set when this column belongs to a sub-board
  name: string
  order: number
}

export interface Card {
  id: string
  projectId: string
  parentCardId?: string // set when this card lives inside a sub-board
  columnId: string
  order: number
  type: CardType
  title: string
  notes?: string
  checklistItems?: ChecklistItem[]
  dueAt?: number
  createdAt: number
}

// A board is either a project's root board ({ projectId }) or a nested sub-board
// ({ projectId, parentCardId }).
export interface Scope {
  projectId: string
  parentCardId?: string
}

export interface KanbanState {
  projects: Project[]
  columns: Column[]
  cards: Card[]
}
