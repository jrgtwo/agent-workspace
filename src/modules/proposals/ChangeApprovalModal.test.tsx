import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProposalStore } from '../../core/proposalStore'
import { ProposalApplier } from '../../core/proposalApplier'
import { ChangeApprovalModal } from './ChangeApprovalModal'

function setup() {
  let n = 0
  const proposals = new ProposalStore(() => `c-${++n}`)
  const applier = new ProposalApplier(proposals)
  return { proposals, applier }
}

describe('ChangeApprovalModal', () => {
  it('renders nothing when there are no pending changes', () => {
    const { proposals, applier } = setup()
    const { container } = render(<ChangeApprovalModal proposals={proposals} applier={applier} />)
    expect(container.firstChild).toBeNull()
  })

  it('does NOT pop for a doc text-edit (those use the in-editor diff review)', () => {
    const { proposals, applier } = setup()
    proposals.propose({ moduleId: 'doc-editor', summary: 'Replace x with y', payload: {} })
    const { container } = render(<ChangeApprovalModal proposals={proposals} applier={applier} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows a prominent modal for a kanban proposal and accepts via the applier', () => {
    const { proposals, applier } = setup()
    let applied = false
    applier.register('kanban-project', () => { applied = true; return true })
    proposals.propose({ moduleId: 'kanban-project', summary: 'Create board "testeroo"', payload: {} })
    render(<ChangeApprovalModal proposals={proposals} applier={applier} />)
    expect(screen.getByText(/approve change/i)).toBeTruthy()
    expect(screen.getByText('Create board "testeroo"')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /accept/i }))
    expect(applied).toBe(true)
    expect(proposals.getState().pending).toHaveLength(0)
  })

  it('rejects via the applier without applying', () => {
    const { proposals, applier } = setup()
    let applied = false
    applier.register('doc-library', () => { applied = true; return true })
    proposals.propose({ moduleId: 'doc-library', summary: 'Create document "Plan.md"', payload: {} })
    render(<ChangeApprovalModal proposals={proposals} applier={applier} />)
    fireEvent.click(screen.getByRole('button', { name: /reject/i }))
    expect(applied).toBe(false)
    expect(proposals.getState().pending).toHaveLength(0)
  })

  it('shows a pending count and surfaces the next change after one is resolved', () => {
    const { proposals, applier } = setup()
    applier.register('kanban-project', () => true)
    proposals.propose({ moduleId: 'kanban-project', summary: 'Create board "A"', payload: {} })
    proposals.propose({ moduleId: 'kanban-project', summary: 'Create board "B"', payload: {} })
    render(<ChangeApprovalModal proposals={proposals} applier={applier} />)
    expect(screen.getByText(/2 pending/i)).toBeTruthy()
    expect(screen.getByText('Create board "A"')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /accept/i }))
    expect(screen.getByText('Create board "B"')).toBeTruthy()
  })
})
