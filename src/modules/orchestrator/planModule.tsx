import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { OrchestratorPlanStore } from './planStore'
import type { PlanStepStatus } from './types'
import type { ProposalStore } from '../../core/proposalStore'
import type { ProposalApplier } from '../../core/proposalApplier'
import type { PreviewStore } from './previewStore'
import './orchestrator.css'

const ICON: Record<PlanStepStatus, string> = { pending: '○', running: '⟳', done: '✓', failed: '✕' }

function PlanPanel({ plan, proposals, applier, preview }: {
  plan: OrchestratorPlanStore; proposals: ProposalStore; applier: ProposalApplier; preview: PreviewStore
}) {
  const { steps } = useStore(plan)
  const { pending } = useStore(proposals)
  const done = steps.filter((s) => s.status === 'done').length

  return (
    <div className="plan">
      <div className="plan__head">
        <span className="plan__title">Plan</span>
        {steps.length > 0 && <span className="plan__tag">{done} / {steps.length} done</span>}
      </div>
      {steps.length === 0 ? (
        <p className="plan__empty">No plan yet — the orchestrator will lay out steps here as it works.</p>
      ) : (
        steps.map((s) => {
          const changes = (s.changeIds ?? []).map((id) => pending.find((c) => c.id === id)).filter(Boolean)
          return (
            <div key={s.id} className="plan__step" onClick={() => s.targetFeature && preview.focus(s.targetFeature)}>
              <span className="plan__stat" aria-label={`status ${s.status}`}>{ICON[s.status]}</span>
              <div className="plan__body">
                {s.title}
                {s.targetFeature && <> <span className="plan__tag">{s.targetFeature}</span></>}
                {s.result && <div className="plan__result">{s.result}</div>}
                {changes.map((c) => (
                  <div key={c!.id} className="plan__change">
                    <span className="plan__change-summary">{c!.summary}</span>
                    <span className="plan__change-btns">
                      <button className="btn btn--icon" aria-label="Accept change" onClick={(e) => { e.stopPropagation(); applier.accept(c!) }}>✓</button>
                      <button className="btn btn--icon" aria-label="Reject change" onClick={(e) => { e.stopPropagation(); applier.reject(c!) }}>✗</button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

export function createPlanModule(deps: {
  plan: OrchestratorPlanStore; proposals: ProposalStore; applier: ProposalApplier; preview: PreviewStore
}): WorkspaceModule {
  return {
    id: 'orchestrator-plan',
    title: 'Plan',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 25, collapsible: true, minSize: 15 },
    render: () => <PlanPanel plan={deps.plan} proposals={deps.proposals} applier={deps.applier} preview={deps.preview} />,
    tools: [],
  }
}
