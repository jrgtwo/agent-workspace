import { useStore } from '../../core/emitter'
import type { ProposalStore } from '../../core/proposalStore'
import type { ProposalApplier } from '../../core/proposalApplier'
// Reuse the permission popup's scrim/popup styling so this looks like the modal used elsewhere.
import '../aiChat/aiChat.css'

/**
 * Doc text-edits (moduleId 'doc-editor', from propose_edit) have their own rich in-editor diff
 * review, so they are NOT surfaced here. Everything else an agent proposes — kanban cards/boards,
 * new documents, document appends — is approved through this prominent modal.
 */
function eligible(moduleId: string): boolean {
  return moduleId !== 'doc-editor'
}

/** A prominent, app-level modal for approving an agent-proposed change. One at a time, like permissions. */
export function ChangeApprovalModal({ proposals, applier }: { proposals: ProposalStore; applier: ProposalApplier }) {
  const { pending } = useStore(proposals)
  const queue = pending.filter((c) => eligible(c.moduleId))
  if (queue.length === 0) return null
  const change = queue[0]
  return (
    <div className="chat-perm__scrim" data-testid="change-approval">
      <div className="chat-perm__popup">
        <div className="chat-perm__title">
          <span className="chat-perm__ic">✎</span>
          <b>APPROVE CHANGE{queue.length > 1 ? ` (${queue.length} pending)` : ''}</b>
        </div>
        <div className="chat-perm__desc">{change.summary}</div>
        <div className="chat-perm__row">
          <button type="button" className="chat-perm__btn chat-perm__btn--allow" onClick={() => applier.accept(change)}>Accept</button>
          <button type="button" className="chat-perm__btn" onClick={() => applier.reject(change)}>Reject</button>
        </div>
      </div>
    </div>
  )
}
