import { useStore } from '../../core/emitter'
import type { KanbanStore } from './kanbanStore'
import type { KanbanNavStore } from './kanbanNavStore'
import type { ProposalStore } from '../../core/proposalStore'
import type { ProposalApplier } from '../../core/proposalApplier'
import { ProjectsList } from './ProjectsList'
import { Board } from './Board'
import './kanban.css'

export function KanbanApp({ store, nav, proposals, applier }: {
  store: KanbanStore; nav: KanbanNavStore; proposals: ProposalStore; applier: ProposalApplier
}) {
  const { view } = useStore(nav)
  return (
    <div className="kanban-root">
      {view.kind === 'projects' ? (
        <ProjectsList store={store} nav={nav} proposals={proposals} applier={applier} />
      ) : (
        <Board store={store} nav={nav} scope={view.scope} proposals={proposals} applier={applier} />
      )}
    </div>
  )
}
