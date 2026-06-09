import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createPlanModule } from './planModule'
import { OrchestratorPlanStore } from './planStore'
import { ProposalStore } from '../../core/proposalStore'
import { ProposalApplier } from '../../core/proposalApplier'
import { PreviewStore } from './previewStore'
import { createStorage } from '../../core/storage/storage'
import { MemoryBackend } from '../../core/storage/memoryBackend'

async function setup() {
  let n = 0
  const store = new OrchestratorPlanStore(createStorage(new MemoryBackend()).scope('p'), () => `st-${++n}`)
  await store.init('A')
  const proposals = new ProposalStore(() => `c-${++n}`)
  const applier = new ProposalApplier(proposals)
  const preview = new PreviewStore()
  return { store, proposals, applier, preview }
}

describe('planModule', () => {
  it('renders an empty state when there is no plan', async () => {
    const { store, proposals, applier, preview } = await setup()
    render(createPlanModule({ plan: store, proposals, applier, preview }).render())
    expect(screen.getByText(/no plan yet/i)).toBeInTheDocument()
  })

  it('renders steps with their title and target feature tag', async () => {
    const { store, proposals, applier, preview } = await setup()
    store.setPlan([{ title: 'Build board', targetFeature: 'kanban', task: 'make it' }])
    render(createPlanModule({ plan: store, proposals, applier, preview }).render())
    expect(screen.getByText('Build board')).toBeInTheDocument()
    expect(screen.getByText('kanban')).toBeInTheDocument()
  })

  it('renders a step\'s pending change inline and accepts it via the applier', async () => {
    let n = 0
    const plan = new OrchestratorPlanStore(createStorage(new MemoryBackend()).scope('plan'), () => `st-${++n}`)
    await plan.init('A')
    const proposals = new ProposalStore(() => `c-${++n}`)
    const applier = new ProposalApplier(proposals)
    let applied = false
    applier.register('kanban-board', () => { applied = true; return true })
    const preview = new PreviewStore()
    const cid = proposals.propose({ moduleId: 'kanban-board', summary: 'Add card "X"', payload: {} })
    plan.setPlan([{ title: 'work', targetFeature: 'kanban', task: 't' }])
    plan.updateStep(plan.getState().steps[0].id, { status: 'done', changeIds: [cid] })

    const mod = createPlanModule({ plan, proposals, applier, preview })
    render(mod.render())
    expect(screen.getByText('Add card "X"')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /accept change/i }))
    expect(applied).toBe(true)
  })

  it('clicking a step focuses the preview on its target feature', async () => {
    let n = 0
    const plan = new OrchestratorPlanStore(createStorage(new MemoryBackend()).scope('plan'), () => `st-${++n}`)
    await plan.init('A')
    const proposals = new ProposalStore(() => `c-${++n}`)
    const applier = new ProposalApplier(proposals)
    const preview = new PreviewStore()
    plan.setPlan([{ title: 'work', targetFeature: 'kanban', task: 't' }])
    const mod = createPlanModule({ plan, proposals, applier, preview })
    render(mod.render())
    fireEvent.click(screen.getByText('work'))
    expect(preview.getState().focusedFeature).toBe('kanban')
  })
})
