import { useEffect, useState } from 'react'
import { createServices, type AppServices } from './app/services'
import { WorkspaceShell } from './shell/WorkspaceShell'

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
  return <WorkspaceShell features={services.features} theme={services.theme} layoutStores={services.layoutStores} />
}
