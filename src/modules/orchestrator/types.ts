import type { Registry } from '../../core/registry'

export type PlanStepStatus = 'pending' | 'running' | 'done' | 'failed'

export interface PlanStep {
  id: string
  title: string
  targetFeature: string // feature id this step delegates to ('' if none yet)
  task: string          // instruction handed to the subagent
  status: PlanStepStatus
  result?: string       // subagent's concise report or error
  changeIds: string[]   // ids of proposals the delegated subagent created for this step
}

export interface SessionMeta {
  id: string
  title: string
  createdAt: number
}

/** A feature the orchestrator can delegate to. */
export interface FeatureAgent {
  id: string
  title: string
  description: string
  registry: Registry
  /** Optional live-state snapshot, injected into the delegated subagent's system prompt each run. */
  contextProvider?: () => string
  /** True for read-only/answer features (e.g. search) that legitimately produce no proposals;
   *  delegate then treats the subagent's summary as the deliverable instead of warning "no changes". */
  informational?: boolean
}
