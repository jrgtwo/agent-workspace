import { useStore } from '../../core/emitter'
import type { ProposalStore } from '../../core/proposalStore'
import type { ProposalApplier } from '../../core/proposalApplier'
import './pendingReview.css'

/** A compact strip listing pending proposals for one module, each Accept/Reject routed through the applier. */
export function PendingReview({ proposals, applier, moduleId }: {
  proposals: ProposalStore
  applier: ProposalApplier
  moduleId: string
}) {
  const { pending } = useStore(proposals)
  const mine = pending.filter((c) => c.moduleId === moduleId)
  if (mine.length === 0) return null
  return (
    <div className="pending-review" aria-label="pending changes">
      <div className="pending-review__head">{mine.length} pending change{mine.length === 1 ? '' : 's'}</div>
      {mine.map((c) => (
        <div key={c.id} className="pending-review__row">
          <span className="pending-review__summary">{c.summary}</span>
          <span className="pending-review__btns">
            <button className="btn btn--icon" aria-label="Accept change" onClick={() => applier.accept(c)}>✓</button>
            <button className="btn btn--icon" aria-label="Reject change" onClick={() => applier.reject(c)}>✗</button>
          </span>
        </div>
      ))}
    </div>
  )
}
