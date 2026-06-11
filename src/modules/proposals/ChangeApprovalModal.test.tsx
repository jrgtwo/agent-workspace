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
    fireEvent.click(screen.getByRole('button', { name: /^accept$/i })) // the single Accept, not "Accept all"
    expect(screen.getByText('Create board "B"')).toBeTruthy()
  })

  it('offers Accept all / Reject all when multiple changes are queued, applying every one', () => {
    const { proposals, applier } = setup()
    const applied: string[] = []
    applier.register('kanban-project', (c) => { applied.push(c.id); return true })
    proposals.propose({ moduleId: 'kanban-project', summary: 'A', payload: {} })
    proposals.propose({ moduleId: 'kanban-project', summary: 'B', payload: {} })
    render(<ChangeApprovalModal proposals={proposals} applier={applier} />)
    fireEvent.click(screen.getByRole('button', { name: /accept all/i }))
    expect(applied).toHaveLength(2)
    expect(proposals.getState().pending).toHaveLength(0)
  })

  it('Reject all discards every queued change without applying', () => {
    const { proposals, applier } = setup()
    let applied = 0
    applier.register('kanban-project', () => { applied++; return true })
    proposals.propose({ moduleId: 'kanban-project', summary: 'A', payload: {} })
    proposals.propose({ moduleId: 'kanban-project', summary: 'B', payload: {} })
    render(<ChangeApprovalModal proposals={proposals} applier={applier} />)
    fireEvent.click(screen.getByRole('button', { name: /reject all/i }))
    expect(applied).toBe(0)
    expect(proposals.getState().pending).toHaveLength(0)
  })

  it('does NOT show Accept all when only one change is queued', () => {
    const { proposals, applier } = setup()
    applier.register('kanban-project', () => true)
    proposals.propose({ moduleId: 'kanban-project', summary: 'only one', payload: {} })
    render(<ChangeApprovalModal proposals={proposals} applier={applier} />)
    expect(screen.queryByRole('button', { name: /accept all/i })).toBeNull()
  })
})
