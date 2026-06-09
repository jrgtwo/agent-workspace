import { Emitter } from '../../core/emitter'
import type { ScopedStore } from '../../core/storage/types'
import type { PlanStep } from './types'

interface PlanState { sessionId: string; steps: PlanStep[] }

export interface PlanStepInput { title: string; targetFeature?: string; task?: string }

export class OrchestratorPlanStore extends Emitter<PlanState> {
  private state: PlanState = { sessionId: '', steps: [] }
  private scope: ScopedStore
  private genId: () => string

  constructor(scope: ScopedStore, genId: () => string) {
    super()
    this.scope = scope
    this.genId = genId
  }

  getState = (): PlanState => this.state

  async init(sessionId: string): Promise<void> {
    const steps = (await this.scope.get<PlanStep[]>(sessionId)) ?? []
    this.state = { sessionId, steps }
    this.notify()
  }

  setPlan(steps: PlanStepInput[]): void {
    this.state = {
      ...this.state,
      steps: steps.map((s) => ({
        id: this.genId(),
        title: s.title,
        targetFeature: s.targetFeature ?? '',
        task: s.task ?? '',
        status: 'pending' as const,
      })),
    }
    void this.flush()
    this.notify()
  }

  updateStep(id: string, patch: Partial<Pick<PlanStep, 'status' | 'result' | 'targetFeature' | 'task' | 'title'>>): void {
    this.state = {
      ...this.state,
      steps: this.state.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }
    void this.flush()
    this.notify()
  }

  async flush(): Promise<void> {
    if (this.state.sessionId) await this.scope.set(this.state.sessionId, this.state.steps)
  }

  async switchTo(sessionId: string): Promise<void> {
    if (sessionId === this.state.sessionId) return
    await this.flush()
    const steps = (await this.scope.get<PlanStep[]>(sessionId)) ?? []
    this.state = { sessionId, steps }
    this.notify()
  }

  async pruneExcept(validIds: string[]): Promise<void> {
    const valid = new Set(validIds)
    for (const key of await this.scope.keys()) {
      if (key !== this.state.sessionId && !valid.has(key)) await this.scope.delete(key)
    }
  }
}
