import type { PendingChange } from '../../core/proposalStore'
import './docEditorReview.css'

export interface DocEditPayload { find: string; replace: string }

export type ReviewSegment =
  | { kind: 'text'; text: string }
  | { kind: 'change'; change: PendingChange }

/**
 * Walk `text` and place each change at the first occurrence of its `find`.
 * Changes whose `find` is absent (or overlap an earlier change) come back as `unplaced`.
 */
export function computeReviewSegments(
  text: string,
  changes: PendingChange[],
): { segments: ReviewSegment[]; unplaced: PendingChange[] } {
  const findOf = (c: PendingChange) => (c.payload as DocEditPayload).find
  const located = changes
    .map((change) => ({ change, at: text.indexOf(findOf(change)) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at)

  const unplaced: PendingChange[] = changes.filter((c) => text.indexOf(findOf(c)) < 0)
  const segments: ReviewSegment[] = []
  let cursor = 0
  for (const { change, at } of located) {
    if (at < cursor) { unplaced.push(change); continue } // overlaps an earlier change
    if (at > cursor) segments.push({ kind: 'text', text: text.slice(cursor, at) })
    segments.push({ kind: 'change', change })
    cursor = at + findOf(change).length
  }
  if (cursor < text.length) segments.push({ kind: 'text', text: text.slice(cursor) })
  return { segments, unplaced }
}

function ChangeInline({ change, onAccept, onReject }: {
  change: PendingChange
  onAccept: (c: PendingChange) => void
  onReject: (c: PendingChange) => void
}) {
  const { find, replace } = change.payload as DocEditPayload
  return (
    <span>
      <span className="diff-del">{find}</span>
      <span className="diff-add">{replace}</span>
      <span className="diff-actions">
        <button className="btn btn--icon" aria-label="Accept this change" onClick={() => onAccept(change)}>✓</button>
        <button className="btn btn--icon" aria-label="Reject this change" onClick={() => onReject(change)}>✗</button>
      </span>
    </span>
  )
}

export function ReviewPanel({ text, changes, onAccept, onReject, onAcceptAll, onRejectAll }: {
  text: string
  changes: PendingChange[]
  onAccept: (c: PendingChange) => void
  onReject: (c: PendingChange) => void
  onAcceptAll: () => void
  onRejectAll: () => void
}) {
  const { segments, unplaced } = computeReviewSegments(text, changes)
  return (
    <div aria-label="diff-review" className="review">
      <div className="review__head">
        <span>{changes.length} proposed change{changes.length > 1 ? 's' : ''}</span>
        <span className="review__actions">
          <button className="btn" onClick={onAcceptAll}>Accept all</button>
          <button className="btn" onClick={onRejectAll}>Reject all</button>
        </span>
      </div>
      <div className="review__body">
        {unplaced.length > 0 && (
          <div className="review__unplaced">
            {unplaced.map((c) => {
              const { find, replace } = c.payload as DocEditPayload
              return (
                <div key={c.id} className="review__unplaced-card">
                  <span className="review__muted">(no longer matches) </span>
                  <span className="diff-del">{find}</span>
                  {' → '}
                  <span className="diff-add">{replace}</span>
                  <span style={{ marginLeft: 6 }}>
                    <button className="btn btn--icon" aria-label="Accept this change" onClick={() => onAccept(c)}>✓</button>
                    <button className="btn btn--icon" aria-label="Reject this change" onClick={() => onReject(c)}>✗</button>
                  </span>
                </div>
              )
            })}
          </div>
        )}
        {segments.map((seg, i) =>
          seg.kind === 'text'
            ? <span key={`t${i}`}>{seg.text}</span>
            : <ChangeInline key={seg.change.id} change={seg.change} onAccept={onAccept} onReject={onReject} />,
        )}
      </div>
    </div>
  )
}
