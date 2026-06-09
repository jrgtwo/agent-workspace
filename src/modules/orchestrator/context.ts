import type { OrchestratorPlanStore } from './planStore'
import type { FeatureAgentRegistry } from './orchestratorTools'

/**
 * A one-shot, plain-text snapshot for the orchestrator, injected into its system prompt each run:
 * which features it can delegate to and the live state of the current session's plan (so it knows
 * what's left and doesn't redo finished steps). Read-only, cheap.
 */
export function describeOrchestratorContext(
  plan: OrchestratorPlanStore,
  featureAgents: FeatureAgentRegistry,
): string {
  const targets =
    [...featureAgents.values()].map((f) => `${f.id} — ${f.description}`).join('; ') || '(none)'
  const { steps } = plan.getState()
  const lines = [`Delegatable features: ${targets}.`]

  if (!steps.length) {
    lines.push('Current plan: (empty) — set one with update_plan before delegating multi-step work.')
  } else {
    lines.push('Current plan:')
    steps.forEach((s, i) => {
      const tgt = s.targetFeature ? ` → ${s.targetFeature}` : ''
      lines.push(`  ${i + 1}. [${s.status}] ${s.title}${tgt}`)
    })
  }
  return lines.join('\n')
}
