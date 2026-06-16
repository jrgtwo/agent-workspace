// src/modules/graph/types.ts
export interface Entity {
  id: string
  type: string
  title: string
  status?: string
  body?: string
  links: string[]          // ids this entity links TO (directed edges)
  createdAt: number
  updatedAt: number
}

export interface GraphState {
  entities: Entity[]
}

/** A batch applied atomically when the user accepts the proposal. */
export interface GraphProposalPayload {
  create?: { type: string; title: string; status?: string; body?: string }[]
  link?: { from: string; to: string }[]   // from/to are entity ids OR exact titles
  update?: { id: string; patch: Partial<Pick<Entity, 'title' | 'status' | 'body' | 'type'>> }[]
}

/** Default board column order; statuses not listed sort after, alphabetically. */
export const DEFAULT_STATUSES = ['To Do', 'Doing', 'Done'] as const
