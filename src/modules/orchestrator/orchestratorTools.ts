import { AgentEngine } from '../../core/agentEngine'
import type { LlamaClient } from '../../core/llamaClient'
import type { PermissionBroker } from '../../core/permissionBroker'
import type { ToolDef } from '../../core/types'
import type { OrchestratorPlanStore, PlanStepInput } from './planStore'
import type { FeatureAgent } from './types'
import type { ProposalStore } from '../../core/proposalStore'
import type { PreviewStore } from './previewStore'

export type FeatureAgentRegistry = Map<string, FeatureAgent>

const SUBAGENT_SYSTEM =
  'You are a focused worker agent inside a local, privacy-first workspace. Complete the user\'s task ' +
  'using ONLY your available tools. Some tools (reads) ask the user for permission first; others ' +
  '(edits, new content, card/board changes) are PROPOSED as pending changes the user reviews and ' +
  'accepts or rejects — either way, just call the tool to carry out the task; you do not wait for a ' +
  'popup, and a proposed change is not applied until the user accepts it. To CHANGE anything you MUST ' +
  'call the matching tool — describing it in words does nothing, and navigating or listing is not the ' +
  'same as creating. (To make a new board, call create_board; do not assume it already exists or just ' +
  'open it.) NEVER claim you created, added, moved, or changed something unless you actually called the ' +
  'tool that does it AND it returned success — if a tool errored or you could not act, say exactly that. ' +
  'If a read is denied or a proposed change is rejected, stop and explain rather than retrying. When ' +
  'done, reply with a concise one-paragraph summary of what you actually did (or why you could not).'

export interface OrchestratorToolDeps {
  plan: OrchestratorPlanStore
  featureAgents: FeatureAgentRegistry
  client: Pick<LlamaClient, 'chat'>
  broker: PermissionBroker
  surfaceId: string
  subagentMaxIters?: number
  proposals: ProposalStore
  preview: PreviewStore
}

export function createOrchestratorTools(deps: OrchestratorToolDeps): ToolDef[] {
  const { plan, featureAgents, client, broker, surfaceId, subagentMaxIters = 8, proposals, preview } = deps
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
        preview.focus(a.targetFeature)
        const stepId = a.stepId ??
          plan.getState().steps.find((s) => s.status === 'pending' && s.targetFeature === a.targetFeature)?.id
        if (stepId) plan.updateStep(stepId, { status: 'running' })
        const before = new Set(proposals.getState().pending.map((p) => p.id))
        const sub = new AgentEngine(client, feature.registry, broker, surfaceId, subagentMaxIters)
        // Seed the feature's own prompt (tool discipline) PLUS the worker/report-back framing, so the
        // subagent is steered as well as the feature's own chat agent — not just the generic prompt.
        sub.seedSystem(feature.prompt ? `${feature.prompt}\n\n${SUBAGENT_SYSTEM}` : SUBAGENT_SYSTEM)
        if (feature.contextProvider) sub.setContextProvider(feature.contextProvider)
        try {
          const result = await sub.run(a.task)
          const created = proposals.getState().pending.filter((p) => !before.has(p.id))
          const changeIds = created.map((p) => p.id)
          let fullResult = result
          if (created.length) {
            fullResult = `${result}\n\n[delegate outcome] Proposed ${created.length} change${created.length === 1 ? '' : 's'} for the user to review and accept: ${created.map((c) => c.summary).join('; ')}.`
          } else if (!feature.informational) {
            fullResult = `${result}\n\n[delegate outcome] The subagent proposed NO changes — nothing was created or modified. Do NOT tell the user the task is done; report that no change was made and, if known, why (the tool may not have been called or returned an error).`
          }
          if (stepId) plan.updateStep(stepId, { status: 'done', result: fullResult, changeIds })
          return { ok: true, result: fullResult, changesProposed: created.length }
        } catch (e) {
          const error = (e as Error).message
          if (stepId) plan.updateStep(stepId, { status: 'failed', result: error })
          return { ok: false, error }
        }
      },
    },
  ]
}
