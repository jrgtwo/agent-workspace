// src/modules/views/ViewArea.tsx
import { useStore } from '../../core/emitter'
import type { LayoutStore } from '../../core/layoutStore'
import type { PanelRegistry } from '../../core/panelRegistry'
import { collectModuleIds } from '../../core/layoutTree'
import { modulesForLayout } from './resolveView'
import type { ViewDef, ViewsStore } from './viewsStore'
import { PanelArea } from '../../shell/PanelArea'
import { AddPanelMenu } from './AddPanelMenu'
import './views.css'

export function ViewArea({ view, viewsStore, registry, layoutStore }: {
  view: ViewDef
  viewsStore: ViewsStore
  registry: PanelRegistry
  layoutStore: LayoutStore
}) {
  const { layout } = useStore(layoutStore)
  const manifest = { id: view.id, name: view.name, icon: view.icon, layout, modules: modulesForLayout(layout, registry) }
  const present = collectModuleIds(layout)
  return (
    <div className="views-area">
      <div className="views-area__bar">
        <span className="views-area__title">{view.icon} {view.name}</span>
        <AddPanelMenu registry={registry} present={present} onAdd={(id) => layoutStore.addPanel(id)} />
        {view.builtIn && <button type="button" className="views-area__reset" onClick={() => { viewsStore.resetBuiltIn(view.id); layoutStore.reset() }}>Reset</button>}
      </div>
      <div className="views-area__panels">
        <PanelArea manifest={manifest} layoutStore={layoutStore} onRemovePanel={(id) => layoutStore.removePanelById(id)} showReset={false} />
      </div>
    </div>
  )
}
