import { useEffect, useState } from 'react'
import type { FeatureManifest } from '../core/types'
import type { LayoutStore } from '../core/layoutStore'
import type { ProposalStore } from '../core/proposalStore'
import type { ProposalApplier } from '../core/proposalApplier'
import { FeatureRail } from './FeatureRail'
import { PanelArea } from './PanelArea'
import { ChangeApprovalModal } from '../modules/proposals/ChangeApprovalModal'
import { useStore } from '../core/emitter'
import { applyTheme, type ThemeStore } from '../core/themeStore'

export function WorkspaceShell({ features, theme, layoutStores, proposals, applier }: {
  features: FeatureManifest[]
  theme: ThemeStore
  layoutStores: Map<string, LayoutStore>
  proposals?: ProposalStore
  applier?: ProposalApplier
}) {
  const [activeId, setActiveId] = useState(features[0].id)
  const active = features.find((f) => f.id === activeId) ?? features[0]
  const { theme: themeId } = useStore(theme)
  useEffect(() => { applyTheme(themeId) }, [themeId])
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <FeatureRail features={features} activeId={activeId} onSelect={setActiveId} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <PanelArea manifest={active} layoutStore={layoutStores.get(active.id)!} />
      </div>
      {proposals && applier && <ChangeApprovalModal proposals={proposals} applier={applier} />}
    </div>
  )
}
