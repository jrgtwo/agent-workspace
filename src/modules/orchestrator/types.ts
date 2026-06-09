import type { Registry } from '../../core/registry'

export type PlanStepStatus = 'pending' | 'running' | 'done' | 'failed'

export interface PlanStep {
  id: string
  title: string
  targetFeature: string // feature id this step delegates to ('' if none yet)
  task: string          // instruction handed to the subagent
  status: PlanStepStatus
  result?: string       // subagent's concise report or error
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
}
