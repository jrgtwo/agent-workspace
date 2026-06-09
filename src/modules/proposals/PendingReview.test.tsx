import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProposalStore } from '../../core/proposalStore'
import { ProposalApplier } from '../../core/proposalApplier'
import { PendingReview } from './PendingReview'

function setup() {
  let n = 0
  const proposals = new ProposalStore(() => `c-${++n}`)
  const applier = new ProposalApplier(proposals)
  const applied: string[] = []
  applier.register('kanban-board', (c) => { applied.push(c.id); return true })
  return { proposals, applier, applied }
}

describe('PendingReview', () => {
  it('renders nothing when there are no pending changes for the module', () => {
    const { proposals, applier } = setup()
    const { container } = render(<PendingReview proposals={proposals} applier={applier} moduleId="kanban-board" />)
    expect(container.firstChild).toBeNull()
  })

  it('lists a pending change summary and accepts via the applier', () => {
    const { proposals, applier, applied } = setup()
    const id = proposals.propose({ moduleId: 'kanban-board', summary: 'Add card "Draft"', payload: {} })
    render(<PendingReview proposals={proposals} applier={applier} moduleId="kanban-board" />)
    expect(screen.getByText('Add card "Draft"')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /accept/i }))
    expect(applied).toEqual([id])
    expect(proposals.getState().pending).toHaveLength(0)
  })

  it('rejects a pending change without applying', () => {
    const { proposals, applier, applied } = setup()
    proposals.propose({ moduleId: 'kanban-board', summary: 'Add card', payload: {} })
    render(<PendingReview proposals={proposals} applier={applier} moduleId="kanban-board" />)
    fireEvent.click(screen.getByRole('button', { name: /reject/i }))
    expect(applied).toEqual([])
    expect(proposals.getState().pending).toHaveLength(0)
  })

  it('only shows changes for its own module', () => {
    const { proposals, applier } = setup()
    proposals.propose({ moduleId: 'doc-library', summary: 'other', payload: {} })
    const { container } = render(<PendingReview proposals={proposals} applier={applier} moduleId="kanban-board" />)
    expect(container.firstChild).toBeNull()
  })
})
