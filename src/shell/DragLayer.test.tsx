import { describe, it, expect, vi } from 'vitest'
import { resolveDrop } from './DragLayer'
import { LayoutStore } from '../core/layoutStore'
import type { LayoutNode } from '../core/types'

const layout: LayoutNode = { type: 'split', direction: 'horizontal', children: [
  { type: 'panel', moduleId: 'chat', draggable: true },
  { type: 'panel', moduleId: 'editor', draggable: true },
] }

describe('resolveDrop', () => {
  it('moves source onto target/zone via the store', () => {
    const store = new LayoutStore(layout)
    const spy = vi.spyOn(store, 'move')
    resolveDrop(store, 'chat', 'editor', 'right')
    expect(spy).toHaveBeenCalledWith('chat', 'editor', 'right')
  })
  it('does nothing when there is no target or zone', () => {
    const store = new LayoutStore(layout)
    const spy = vi.spyOn(store, 'move')
    resolveDrop(store, 'chat', null, null)
    expect(spy).not.toHaveBeenCalled()
  })
})
