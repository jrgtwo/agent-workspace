import { useStore } from '../../core/emitter'
import type { KanbanStore } from './kanbanStore'
import type { KanbanNavStore } from './kanbanNavStore'
import { ProjectsList } from './ProjectsList'
import { Board } from './Board'
import './kanban.css'

export function KanbanApp({ store, nav }: { store: KanbanStore; nav: KanbanNavStore }) {
  const { view } = useStore(nav)
  return (
    <div className="kanban-root">
      {view.kind === 'projects' ? (
        <ProjectsList store={store} nav={nav} />
      ) : (
        <Board store={store} nav={nav} scope={view.scope} />
      )}
    </div>
  )
}
