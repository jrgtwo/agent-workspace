import { describe, it, expect } from 'vitest'
import { reconcile } from './layoutStore'
import type { LayoutNode } from './types'

const def: LayoutNode = { type: 'split', direction: 'horizontal', children: [
  { type: 'panel', moduleId: 'explorer' },
  { type: 'panel', moduleId: 'chat', draggable: true },
] }

describe('reconcile', () => {
  it('keeps a saved layout with the same module set, re-stamping draggable from the default', () => {
    const saved: LayoutNode = { type: 'split', direction: 'horizontal', children: [
      { type: 'panel', moduleId: 'chat', draggable: false },
      { type: 'panel', moduleId: 'explorer', draggable: true },
    ] }
    const out = reconcile(saved, def)
    expect(collectModuleOrder(out)).toEqual(['chat', 'explorer'])
    expect(draggableOf(out, 'chat')).toBe(true)
    expect(draggableOf(out, 'explorer')).toBeUndefined()
  })
  it('falls back to default when the module set differs', () => {
    const saved: LayoutNode = { type: 'panel', moduleId: 'chat', draggable: true }
    expect(reconcile(saved, def)).toBe(def)
  })
})

function collectModuleOrder(n: LayoutNode): string[] {
  return n.type === 'panel' ? [n.moduleId] : n.children.flatMap(collectModuleOrder)
}
function draggableOf(n: LayoutNode, id: string): boolean | undefined {
  if (n.type === 'panel') return n.moduleId === id ? n.draggable : undefined
  for (const c of n.children) { if (findIn(c, id)) return draggableOf(c, id) }
  return undefined
}
function findIn(n: LayoutNode, id: string): boolean {
  return n.type === 'panel' ? n.moduleId === id : n.children.some((c) => findIn(c, id))
}

import { LayoutStore } from './layoutStore'

const dflt: LayoutNode = { type: 'split', direction: 'horizontal', children: [
  { type: 'panel', moduleId: 'explorer' },
  { type: 'panel', moduleId: 'chat', draggable: true },
  { type: 'panel', moduleId: 'editor', draggable: true },
] }

describe('LayoutStore', () => {
  it('starts at the default layout', () => {
    expect(new LayoutStore(dflt).getState().layout).toBe(dflt)
  })
  it('move() applies a valid move and notifies', () => {
    const s = new LayoutStore(dflt)
    let calls = 0; s.subscribe(() => { calls++ })
    s.move('chat', 'editor', 'center')
    expect(collectModuleOrder(s.getState().layout)).toEqual(['explorer', 'editor', 'chat'])
    expect(calls).toBe(1)
  })
  it('move() no-ops (no notify) on an invalid move', () => {
    const s = new LayoutStore(dflt)
    let calls = 0; s.subscribe(() => { calls++ })
    s.move('explorer', 'chat', 'right')
    expect(calls).toBe(0)
    expect(s.getState().layout).toBe(dflt)
  })
  it('reset() restores the default', () => {
    const s = new LayoutStore(dflt)
    s.move('chat', 'editor', 'center')
    s.reset()
    expect(s.getState().layout).toBe(dflt)
  })
  it('hydrate() reconciles saved state', () => {
    const s = new LayoutStore(dflt)
    s.hydrate({ layout: { type: 'panel', moduleId: 'chat' } })
    expect(s.getState().layout).toBe(dflt)
  })
})
