import { useEffect, useState } from 'react'
import type { FeatureManifest } from '../core/types'
import { FeatureRail } from './FeatureRail'
import { PanelArea } from './PanelArea'
import { useStore } from '../core/emitter'
import { applyTheme, type ThemeStore } from '../core/themeStore'

export function WorkspaceShell({ features, theme }: { features: FeatureManifest[]; theme: ThemeStore }) {
  const [activeId, setActiveId] = useState(features[0].id)
  const active = features.find((f) => f.id === activeId) ?? features[0]
  const { theme: themeId } = useStore(theme)

  useEffect(() => { applyTheme(themeId) }, [themeId])

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <FeatureRail
        features={features}
        activeId={activeId}
        onSelect={setActiveId}
        activeTheme={themeId}
        onTheme={(id) => theme.setTheme(id)}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <PanelArea manifest={active} />
      </div>
    </div>
  )
}
