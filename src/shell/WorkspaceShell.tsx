import { useState } from 'react'
import type { FeatureManifest } from '../core/types'
import { FeatureRail } from './FeatureRail'
import { PanelArea } from './PanelArea'

export function WorkspaceShell({ features }: { features: FeatureManifest[] }) {
  const [activeId, setActiveId] = useState(features[0].id)
  const active = features.find((f) => f.id === activeId) ?? features[0]
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <FeatureRail features={features} activeId={activeId} onSelect={setActiveId} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <PanelArea manifest={active} />
      </div>
    </div>
  )
}
