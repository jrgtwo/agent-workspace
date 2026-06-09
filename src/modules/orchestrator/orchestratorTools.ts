import { AgentEngine } from '../../core/agentEngine'
import type { LlamaClient } from '../../core/llamaClient'
import type { PermissionBroker } from '../../core/permissionBroker'
import type { ToolDef } from '../../core/types'
import type { OrchestratorPlanStore, PlanStepInput } from './planStore'
import type { FeatureAgent } from './types'

export type FeatureAgentRegistry = Map<string, FeatureAgent>

const SUBAGENT_SYSTEM =
  'You are a focused worker agent inside a local, privacy-first workspace. Complete the user\'s task ' +
  'using ONLY your available tools, requesting permission via tools as normal. When done, reply with a ' +
  'concise one-paragraph summary of what you did (or why you could not).'

export interface OrchestratorToolDeps {
  plan: OrchestratorPlanStore
  featureAgents: FeatureAgentRegistry
  client: Pick<LlamaClient, 'chat'>
  broker: PermissionBroker
  surfaceId: string
  subagentMaxIters?: number
}

export function createOrchestratorTools(deps: OrchestratorToolDeps): ToolDef[] {
  const { plan, featureAgents, client, broker, surfaceId, subagentMaxIters = 8 } = deps
  const targetList = () =>
    [...featureAgents.values()].map((f) => `${f.id} — ${f.description}`).join('; ') || '(none registered)'

  return [
    {
      name: 'update_plan',
      description:
        'Declare or replace the plan for this conversation as an ordered list of steps. Each step has a ' +
        'title, the targetFeature it will be delegated to, and the task instruction. Call this whenever the ' +
        'plan changes (e.g. before starting, or after a step fails). Delegation targets: ' + targetList(),
      parameters: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                targetFeature: { type: 'string' },
                task: { type: 'string' },
              },
              required: ['title'],
            },
          },
        },
        required: ['steps'],
      },
      handler: (a: { steps: PlanStepInput[] }) => {
        const steps = Array.isArray(a?.steps) ? a.steps : []
        plan.setPlan(steps)
        return { ok: true, count: steps.length }
      },
    },
    {
      name: 'delegate',
      description:
        'Delegate a focused task to a feature subagent, which runs with ONLY that feature\'s tools and ' +
        'reports back a summary. Provide the targetFeature id and a complete, self-contained task (include ' +
        'any context the subagent needs — it cannot see this conversation). Optionally pass stepId to link ' +
        'it to a plan step. Targets: ' + targetList(),
      parameters: {
        type: 'object',
        properties: {
          targetFeature: { type: 'string' },
          task: { type: 'string' },
          stepId: { type: 'string' },
        },
        required: ['targetFeature', 'task'],
      },
      handler: async (a: { targetFeature: string; task: string; stepId?: string }) => {
        const feature = featureAgents.get(a.targetFeature)
        if (!feature) {
          return { ok: false, error: `No such feature: "${a.targetFeature}". Available: ${[...featureAgents.keys()].join(', ') || '(none)'}.` }
        }
        // Auto-link to the first pending step for this feature when no stepId provided.
        const stepId = a.stepId ??
          plan.getState().steps.find((s) => s.status === 'pending' && s.targetFeature === a.targetFeature)?.id
        if (stepId) plan.updateStep(stepId, { status: 'running' })
        const sub = new AgentEngine(client, feature.registry, broker, surfaceId, subagentMaxIters)
        sub.seedSystem(SUBAGENT_SYSTEM)
        // Give the subagent the same live state the feature's own agent sees (open board, etc.).
        if (feature.contextProvider) sub.setContextProvider(feature.contextProvider)
        try {
          const result = await sub.run(a.task)
          if (stepId) plan.updateStep(stepId, { status: 'done', result })
          return { ok: true, result }
        } catch (e) {
          const error = (e as Error).message
          if (stepId) plan.updateStep(stepId, { status: 'failed', result: error })
          return { ok: false, error }
        }
      },
    },
  ]
}
