import { useRef, useState, useEffect } from 'react'
import type { FeatureManifest } from '../core/types'
import { LayoutStore } from '../core/layoutStore'
import type { ProposalStore } from '../core/proposalStore'
import type { ProposalApplier } from '../core/proposalApplier'
import type { ViewsStore, ViewDef } from '../modules/views/viewsStore'
import type { PanelRegistry } from '../core/panelRegistry'
import { FeatureRail } from './FeatureRail'
import { PanelArea } from './PanelArea'
import { ViewArea } from '../modules/views/ViewArea'
import { ChangeApprovalModal } from '../modules/proposals/ChangeApprovalModal'
import { useStore } from '../core/emitter'
import { applyTheme, type ThemeStore } from '../core/themeStore'
import { AssistantDock, type AssistantDockProps } from './AssistantDock'

type ShellProps = {
  features: FeatureManifest[]
  theme: ThemeStore
  layoutStores: Map<string, LayoutStore>
  proposals?: ProposalStore
  applier?: ProposalApplier
  viewsStore?: ViewsStore
  registry?: PanelRegistry
  dock?: AssistantDockProps
}

export function WorkspaceShell({ features, theme, layoutStores, proposals, applier, viewsStore, registry, dock }: ShellProps) {
  const { theme: themeId } = useStore(theme)
  useEffect(() => { applyTheme(themeId) }, [themeId])
  if (viewsStore && registry) {
    return <ComposableShell features={features} layoutStores={layoutStores} proposals={proposals} applier={applier} viewsStore={viewsStore} registry={registry} dock={dock} />
  }
  return <LegacyShell features={features} layoutStores={layoutStores} proposals={proposals} applier={applier} dock={dock} />
}

function LegacyShell({ features, layoutStores, proposals, applier, dock }: {
  features: FeatureManifest[]; layoutStores: Map<string, LayoutStore>; proposals?: ProposalStore; applier?: ProposalApplier; dock?: AssistantDockProps
}) {
  const [activeId, setActiveId] = useState(features[0].id)
  const active = features.find((f) => f.id === activeId) ?? features[0]
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <FeatureRail features={features} activeId={activeId} onSelect={setActiveId} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <PanelArea manifest={active} layoutStore={layoutStores.get(active.id)!} />
      </div>
      {dock && <AssistantDock {...dock} />}
      {proposals && applier && <ChangeApprovalModal proposals={proposals} applier={applier} />}
    </div>
  )
}

function ComposableShell({ features, layoutStores, proposals, applier, viewsStore, registry, dock }: {
  features: FeatureManifest[]; layoutStores: Map<string, LayoutStore>; proposals?: ProposalStore; applier?: ProposalApplier; viewsStore: ViewsStore; registry: PanelRegistry; dock?: AssistantDockProps
}) {
  const { views } = useStore(viewsStore)
  const [activeId, setActiveId] = useState(features[0].id)
  const activeFeature = features.find((f) => f.id === activeId)
  const activeView = views.find((v) => v.id === activeId)
  const viewLayouts = useRef(new Map<string, LayoutStore>())
  const layoutFor = (view: ViewDef): LayoutStore => {
    let ls = viewLayouts.current.get(view.id)
    if (!ls) {
      ls = new LayoutStore(view.layout)
      const store = ls
      store.subscribe(() => viewsStore.updateLayout(view.id, store.getState().layout))
      viewLayouts.current.set(view.id, store)
    }
    return ls
  }
  const fallback = activeFeature ?? features[0]
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <FeatureRail
        features={features}
        views={views}
        activeId={activeId}
        onSelect={setActiveId}
        onNewView={() => setActiveId(viewsStore.createView('New view', { type: 'panel', moduleId: 'connectors-tree', draggable: true }))}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {activeView
          ? <ViewArea view={activeView} viewsStore={viewsStore} registry={registry} layoutStore={layoutFor(activeView)} />
          : <PanelArea manifest={fallback} layoutStore={layoutStores.get(fallback.id)!} />}
      </div>
      {dock && <AssistantDock {...dock} />}
      {proposals && applier && <ChangeApprovalModal proposals={proposals} applier={applier} />}
    </div>
  )
}
