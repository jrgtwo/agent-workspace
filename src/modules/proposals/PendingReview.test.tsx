import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProposalStore } from '../../core/proposalStore'
import { ProposalApplier } from '../../core/proposalApplier'
import { PendingReview } from './PendingReview'

function setup() {
  let n = 0
  const proposals = new ProposalStore(() => `c-${++n}`)
  const applier = new ProposalApplier(proposals)
  return { proposals, applier }
}

describe('PendingReview (read-only indicator)', () => {
  it('renders nothing when there are no pending changes for the module', () => {
    const { proposals, applier } = setup()
    const { container } = render(<PendingReview proposals={proposals} applier={applier} moduleId="kanban-board" />)
    expect(container.firstChild).toBeNull()
  })

  it('lists a pending change summary as an "awaiting approval" indicator with NO action buttons', () => {
    const { proposals, applier } = setup()
    proposals.propose({ moduleId: 'kanban-board', summary: 'Add card "Draft"', payload: {} })
    render(<PendingReview proposals={proposals} applier={applier} moduleId="kanban-board" />)
    expect(screen.getByText('Add card "Draft"')).toBeTruthy()
    expect(screen.getByText(/awaiting approval/i)).toBeTruthy()
    // Approval moved to the ChangeApprovalModal — this indicator must not render Accept/Reject controls.
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('only shows changes for its own module', () => {
    const { proposals, applier } = setup()
    proposals.propose({ moduleId: 'doc-library', summary: 'other', payload: {} })
    const { container } = render(<PendingReview proposals={proposals} applier={applier} moduleId="kanban-board" />)
    expect(container.firstChild).toBeNull()
  })
})
