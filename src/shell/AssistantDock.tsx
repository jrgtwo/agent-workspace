import { useCallback, type ReactNode } from 'react'
import { useStore } from '../core/emitter'
import type { DockStore } from '../core/dockStore'
import type { OrchestratorSessionStore } from '../modules/orchestrator/sessionStore'
import { DockSessionMenu } from './DockSessionMenu'
import './assistantDock.css'

export interface AssistantDockProps {
  dockStore: DockStore
  sessionStore: OrchestratorSessionStore
  chat: () => ReactNode
  plan: () => ReactNode
  preview: () => ReactNode
}

export function AssistantDock({ dockStore, sessionStore, chat, plan, preview }: AssistantDockProps) {
  const { collapsed, width, openDrawer } = useStore(dockStore)

  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const onMove = (ev: PointerEvent) => dockStore.setWidth(window.innerWidth - ev.clientX)
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [dockStore])

  if (collapsed) {
    return (
      <div className="dock dock--collapsed">
        <button className="dock__expand btn btn--icon" aria-label="Open assistant" onClick={() => dockStore.toggleCollapsed()}>🤖</button>
      </div>
    )
  }

  return (
    <div className="dock" style={{ width }}>
      <div className="dock__resize" role="separator" aria-label="Resize assistant" onPointerDown={startResize} />
      <div className="dock__header">
        <DockSessionMenu store={sessionStore} />
        <div className="dock__tabs">
          <button className={`dock__tab btn btn--icon${openDrawer === 'plan' ? ' dock__tab--active' : ''}`} aria-pressed={openDrawer === 'plan'} onClick={() => dockStore.openDrawer('plan')}>Plan</button>
          <button className={`dock__tab btn btn--icon${openDrawer === 'preview' ? ' dock__tab--active' : ''}`} aria-pressed={openDrawer === 'preview'} onClick={() => dockStore.openDrawer('preview')}>Preview</button>
        </div>
        <button className="dock__collapse btn btn--icon" aria-label="Collapse assistant" onClick={() => dockStore.toggleCollapsed()}>⟩</button>
      </div>
      <div className="dock__body">{chat()}</div>
      {openDrawer && (
        <div className="dock__drawer">{openDrawer === 'plan' ? plan() : preview()}</div>
      )}
    </div>
  )
}
