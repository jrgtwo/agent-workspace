import { useMemo } from 'react'
import { createServices } from './app/services'
import { WorkspaceShell } from './shell/WorkspaceShell'

export default function App() {
  const services = useMemo(() => createServices(), [])
  return <WorkspaceShell features={services.features} />
}
