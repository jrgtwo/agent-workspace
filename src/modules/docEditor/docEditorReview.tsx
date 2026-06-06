import type { PendingChange } from '../../core/proposalStore'

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
      <span style={{ color: '#c0392b', textDecoration: 'line-through', background: '#fdecea', borderRadius: 3, padding: '0 2px' }}>{find}</span>
      <span style={{ color: '#1e7e38', background: '#e7f6ec', borderRadius: 3, padding: '0 2px' }}>{replace}</span>
      <span style={{ display: 'inline-flex', gap: 2, margin: '0 4px', verticalAlign: 'middle' }}>
        <button aria-label="Accept this change" onClick={() => onAccept(change)} style={{ fontSize: 10 }}>✓</button>
        <button aria-label="Reject this change" onClick={() => onReject(change)} style={{ fontSize: 10 }}>✗</button>
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
    <div aria-label="diff-review" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: '#eef0ff', borderBottom: '1px solid #c9cffb', fontSize: 11, color: '#3a44b5' }}>
        <span>{changes.length} proposed change{changes.length > 1 ? 's' : ''}</span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button onClick={onAcceptAll}>Accept all</button>
          <button onClick={onRejectAll}>Reject all</button>
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, whiteSpace: 'pre-wrap', font: 'inherit', fontSize: 13, lineHeight: 1.7 }}>
        {unplaced.length > 0 && (
          <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {unplaced.map((c) => {
              const { find, replace } = c.payload as DocEditPayload
              return (
                <div key={c.id} style={{ background: '#fff7e6', border: '1px solid #ffe2a8', borderRadius: 6, padding: 6, fontSize: 12 }}>
                  <span style={{ color: '#999' }}>(no longer matches) </span>
                  <span style={{ textDecoration: 'line-through', color: '#c0392b' }}>{find}</span>
                  {' → '}
                  <span style={{ color: '#1e7e38' }}>{replace}</span>
                  <span style={{ marginLeft: 6 }}>
                    <button aria-label="Accept this change" onClick={() => onAccept(c)}>✓</button>
                    <button aria-label="Reject this change" onClick={() => onReject(c)}>✗</button>
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
