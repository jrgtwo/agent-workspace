import { describe, it, expect } from 'vitest'
import { describeOrchestratorContext } from './context'
import type { OrchestratorPlanStore } from './planStore'
import type { FeatureAgentRegistry } from './orchestratorTools'
import type { PlanStep } from './types'

function fakePlan(steps: PlanStep[]): OrchestratorPlanStore {
  return { getState: () => ({ sessionId: 's', steps }) } as unknown as OrchestratorPlanStore
}

const targets: FeatureAgentRegistry = new Map([
  ['notes', { id: 'notes', title: 'Notes', description: 'Edit docs.', registry: {} as never }],
  ['kanban', { id: 'kanban', title: 'Kanban', description: 'Manage boards.', registry: {} as never }],
])

describe('describeOrchestratorContext', () => {
  it('lists the delegation targets', () => {
    const ctx = describeOrchestratorContext(fakePlan([]), targets)
    expect(ctx).toContain('notes')
    expect(ctx).toContain('kanban')
  })

  it('notes when there is no plan yet', () => {
    const ctx = describeOrchestratorContext(fakePlan([]), targets)
    expect(ctx).toMatch(/no .*plan|plan: \(empty\)|empty/i)
  })

  it('renders the current plan steps with their statuses and targets', () => {
    const steps: PlanStep[] = [
      { id: '1', title: 'Make board', targetFeature: 'kanban', task: 't', status: 'done' },
      { id: '2', title: 'Add cards', targetFeature: 'kanban', task: 't', status: 'running' },
      { id: '3', title: 'Summarize', targetFeature: 'notes', task: 't', status: 'pending' },
    ]
    const ctx = describeOrchestratorContext(fakePlan(steps), targets)
    expect(ctx).toMatch(/done/)
    expect(ctx).toMatch(/running/)
    expect(ctx).toContain('Add cards')
    expect(ctx).toContain('Summarize')
  })
})
