/** A token-level diff segment between two strings. */
export type Segment = { type: 'same' | 'del' | 'add'; text: string }

/** Payload the agent's propose_edit tool enqueues for a document change. */
export interface DocEditPayload {
  find: string
  replace: string
  /** One-line rationale the agent supplies for why this edit is proposed. */
  reason: string
}

/** Payload the append_document tool enqueues — appended markdown plus a rationale. */
export interface DocAppendPayload {
  text: string
  reason: string
}
