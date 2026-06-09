import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KanbanStore } from './kanbanStore'
import { KanbanNavStore } from './kanbanNavStore'
import { ProposalStore } from '../../core/proposalStore'
import { ProposalApplier } from '../../core/proposalApplier'
import { KanbanApp } from './KanbanApp'

describe('kanban surfaces pending proposals', () => {
  it('shows a pending board proposal on the projects list and accepting it creates the board', () => {
    let n = 0
    const store = new KanbanStore(() => `k-${++n}`, () => 0)
    const nav = new KanbanNavStore()
    const proposals = new ProposalStore(() => `c-${++n}`)
    const applier = new ProposalApplier(proposals)
    applier.register('kanban-project', (c) => { store.createProject(c.payload as { name: string }); return true })
    proposals.propose({ moduleId: 'kanban-project', summary: 'Create board "New"', payload: { name: 'New' } })

    render(<KanbanApp store={store} nav={nav} proposals={proposals} applier={applier} />)
    expect(screen.getByText('Create board "New"')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /accept change/i }))
    expect(store.getState().projects.map((p) => p.name)).toContain('New')
  })

  it('shows a pending card proposal on an open board', () => {
    let n = 0
    const store = new KanbanStore(() => `k-${++n}`, () => 0)
    const nav = new KanbanNavStore()
    const proposals = new ProposalStore(() => `c-${++n}`)
    const applier = new ProposalApplier(proposals)
    const pid = store.createProject({ name: 'P' })
    nav.openBoard({ projectId: pid })
    proposals.propose({ moduleId: 'kanban-board', summary: 'Add card "Draft" to Backlog', payload: {} })

    render(<KanbanApp store={store} nav={nav} proposals={proposals} applier={applier} />)
    expect(screen.getByText('Add card "Draft" to Backlog')).toBeTruthy()
  })
})
