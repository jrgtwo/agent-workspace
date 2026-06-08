import type { JSX, CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { LayoutStore } from '../core/layoutStore'
import { zoneFromRect, type Zone } from '../core/layoutTree'

/** Apply a resolved drop to the store. Unit-tested. */
export function resolveDrop(store: LayoutStore, sourceId: string, targetId: string | null, zone: Zone | null): void {
  if (!targetId || !zone) return
  store.move(sourceId, targetId, zone)
}

interface DragState { sourceId: string; x: number; y: number; targetId: string | null; zone: Zone | null }

/** Returns `startDrag(moduleId, event)` to bind to panel grips, plus the overlay element to render. */
export function useDragLayer(store: LayoutStore): { startDrag: (moduleId: string, e: ReactPointerEvent) => void; overlay: JSX.Element | null } {
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  dragRef.current = drag
  const active = drag !== null // gate listeners on drag start/end, not on every pointer move

  useEffect(() => {
    if (!active) return
    const onMove = (e: globalThis.PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-module]')
      const targetId = el?.dataset.module ?? null
      let zone: Zone | null = null
      if (el && targetId && targetId !== dragRef.current?.sourceId) {
        const r = el.getBoundingClientRect()
        zone = zoneFromRect({ left: r.left, top: r.top, width: r.width, height: r.height }, { x: e.clientX, y: e.clientY })
      }
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY, targetId, zone } : d))
    }
    const onUp = () => {
      const d = dragRef.current
      if (d) resolveDrop(store, d.sourceId, d.targetId, d.zone)
      setDrag(null)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrag(null) }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKey)
    }
  }, [active, store])

  const startDrag = (moduleId: string, e: ReactPointerEvent) => {
    e.preventDefault()
    setDrag({ sourceId: moduleId, x: e.clientX, y: e.clientY, targetId: null, zone: null })
  }

  const overlay = drag ? <DragOverlay drag={drag} /> : null
  return { startDrag, overlay }
}

function DragOverlay({ drag }: { drag: DragState }): JSX.Element {
  let highlight: JSX.Element | null = null
  if (drag.targetId && drag.zone) {
    const el = document.querySelector<HTMLElement>(`[data-module="${drag.targetId}"]`)
    if (el) {
      const r = el.getBoundingClientRect()
      const base: CSSProperties = { position: 'fixed', pointerEvents: 'none', zIndex: 9998 }
      const box: CSSProperties =
        drag.zone === 'center' ? { left: r.left, top: r.top, width: r.width, height: r.height }
        : drag.zone === 'left' ? { left: r.left, top: r.top, width: r.width / 2, height: r.height }
        : drag.zone === 'right' ? { left: r.left + r.width / 2, top: r.top, width: r.width / 2, height: r.height }
        : drag.zone === 'top' ? { left: r.left, top: r.top, width: r.width, height: r.height / 2 }
        : { left: r.left, top: r.top + r.height / 2, width: r.width, height: r.height / 2 }
      highlight = <div className="drag-zone" style={{ ...base, ...box }} />
    }
  }
  return (
    <>
      {highlight}
      <div className="drag-ghost" style={{ position: 'fixed', left: drag.x + 8, top: drag.y + 8, pointerEvents: 'none', zIndex: 9999 }}>⠿</div>
    </>
  )
}
