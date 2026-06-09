import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { OrchestratorPlanStore } from './planStore'
import type { PlanStepStatus } from './types'
import './orchestrator.css'

const ICON: Record<PlanStepStatus, string> = { pending: '○', running: '⟳', done: '✓', failed: '✕' }

function PlanPanel({ store }: { store: OrchestratorPlanStore }) {
  const { steps } = useStore(store)
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
        steps.map((s) => (
          <div key={s.id} className="plan__step">
            <span className="plan__stat" aria-label={`status ${s.status}`}>{ICON[s.status]}</span>
            <div className="plan__body">
              {s.title}
              {s.targetFeature && <> <span className="plan__tag">{s.targetFeature}</span></>}
              {s.result && <div className="plan__result">{s.result}</div>}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export function createPlanModule(store: OrchestratorPlanStore): WorkspaceModule {
  return {
    id: 'orchestrator-plan',
    title: 'Plan',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 34, collapsible: true, minSize: 20 },
    render: () => <PlanPanel store={store} />,
    tools: [],
  }
}
