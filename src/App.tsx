import { useEffect, useState } from 'react'
import { createServices, type AppServices } from './app/services'
import { WorkspaceShell } from './shell/WorkspaceShell'
import { createAiChatModule } from './modules/aiChat/aiChatModule'
import { createPlanModule } from './modules/orchestrator/planModule'
import { createPreviewModule } from './modules/orchestrator/previewModule'

export default function App() {
  const [services, setServices] = useState<AppServices | null>(null)

  useEffect(() => {
    let alive = true
    createServices().then((s) => { if (alive) setServices(s) })
    return () => { alive = false }
  }, [])

  if (!services) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', color: 'var(--text-muted)', background: 'var(--bg)', font: 'inherit' }}>
        Loading workspace…
      </div>
    )
  }

  const chatModule = createAiChatModule(services.orchestratorEngine, services.broker, services.agentAccent)
  const planModule = createPlanModule({ plan: services.planStore, proposals: services.proposals, applier: services.applier, preview: services.preview })
  const previewModule = createPreviewModule(services.preview, services.previewRenderers)
  const dock = {
    dockStore: services.dockStore,
    sessionStore: services.sessionStore,
    chat: chatModule.render,
    plan: planModule.render,
    preview: previewModule.render,
  }

  return (
    <WorkspaceShell
      features={services.features}
      theme={services.theme}
      layoutStores={services.layoutStores}
      proposals={services.proposals}
      applier={services.applier}
      viewsStore={services.viewsStore}
      registry={services.registry}
      dock={dock}
    />
  )
}
