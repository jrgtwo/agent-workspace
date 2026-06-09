import { useStore } from '../../core/emitter'
import type { ProposalStore } from '../../core/proposalStore'
import type { ProposalApplier } from '../../core/proposalApplier'
import './pendingReview.css'

/**
 * A read-only indicator of pending proposals for one module, shown in-context (e.g. on the board or
 * in the preview). Approval happens in the app-level ChangeApprovalModal — this no longer renders
 * Accept/Reject buttons, because a ✓/✗ here reads as a "done" check rather than an action.
 * `applier` is kept in the props for call-site compatibility but is intentionally unused.
 */
export function PendingReview({ proposals, moduleId }: {
  proposals: ProposalStore
  applier: ProposalApplier
  moduleId: string
}) {
  const { pending } = useStore(proposals)
  const mine = pending.filter((c) => c.moduleId === moduleId)
  if (mine.length === 0) return null
  return (
    <div className="pending-review" aria-label="pending changes">
      <div className="pending-review__head">⏳ {mine.length} change{mine.length === 1 ? '' : 's'} awaiting approval</div>
      {mine.map((c) => (
        <div key={c.id} className="pending-review__row">
          <span className="pending-review__summary">{c.summary}</span>
        </div>
      ))}
    </div>
  )
}
