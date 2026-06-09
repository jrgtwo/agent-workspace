import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createPlanModule } from './planModule'
import { OrchestratorPlanStore } from './planStore'
import { createStorage } from '../../core/storage/storage'
import { MemoryBackend } from '../../core/storage/memoryBackend'

async function setup() {
  let n = 0
  const store = new OrchestratorPlanStore(createStorage(new MemoryBackend()).scope('p'), () => `st-${++n}`)
  await store.init('A')
  return store
}

describe('planModule', () => {
  it('renders an empty state when there is no plan', async () => {
    const store = await setup()
    render(createPlanModule(store).render())
    expect(screen.getByText(/no plan yet/i)).toBeInTheDocument()
  })

  it('renders steps with their title and target feature tag', async () => {
    const store = await setup()
    store.setPlan([{ title: 'Build board', targetFeature: 'kanban', task: 'make it' }])
    render(createPlanModule(store).render())
    expect(screen.getByText('Build board')).toBeInTheDocument()
    expect(screen.getByText('kanban')).toBeInTheDocument()
  })
})
