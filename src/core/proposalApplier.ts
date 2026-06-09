import type { PendingChange, ProposalStore } from './proposalStore'

/** Applies a pending change to its owning feature store. Returns whether it applied. */
export type Applier = (change: PendingChange) => boolean

/**
 * Single apply path for pending proposals. Feature stores register an applier keyed by moduleId;
 * any surface (feature panel, orchestrator plan, preview) calls accept/reject so they never diverge.
 */
export class ProposalApplier {
  private appliers = new Map<string, Applier>()
  private proposals: ProposalStore

  constructor(proposals: ProposalStore) {
    this.proposals = proposals
  }

  register(moduleId: string, fn: Applier): void {
    this.appliers.set(moduleId, fn)
  }

  accept(change: PendingChange): boolean {
    const fn = this.appliers.get(change.moduleId)
    if (!fn) return false
    if (fn(change)) {
      this.proposals.remove(change.id)
      return true
    }
    return false
  }

  reject(change: PendingChange): void {
    this.proposals.remove(change.id)
  }
}
