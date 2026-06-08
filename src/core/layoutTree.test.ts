import { describe, it, expect } from 'vitest'
import { collectModuleIds, findPanel } from './layoutTree'
import { normalize, removePanel } from './layoutTree'
import type { LayoutNode } from './types'

const tree: LayoutNode = {
  type: 'split', direction: 'horizontal', children: [
    { type: 'panel', moduleId: 'a', draggable: true },
    { type: 'split', direction: 'vertical', children: [
      { type: 'panel', moduleId: 'b' },
      { type: 'panel', moduleId: 'c', draggable: true },
    ] },
  ],
}

describe('collectModuleIds', () => {
  it('lists every panel moduleId (depth-first)', () => {
    expect(collectModuleIds(tree)).toEqual(['a', 'b', 'c'])
  })
})

describe('findPanel', () => {
  it('finds a nested panel and returns its draggable flag', () => {
    expect(findPanel(tree, 'c')).toEqual({ type: 'panel', moduleId: 'c', draggable: true })
  })
  it('returns null for a missing id', () => {
    expect(findPanel(tree, 'zzz')).toBeNull()
  })
})

describe('normalize', () => {
  it('collapses a single-child split to its child', () => {
    const n: LayoutNode = { type: 'split', direction: 'horizontal', children: [{ type: 'panel', moduleId: 'a' }] }
    expect(normalize(n)).toEqual({ type: 'panel', moduleId: 'a' })
  })
  it('merges a nested split of the same direction', () => {
    const n: LayoutNode = { type: 'split', direction: 'horizontal', children: [
      { type: 'panel', moduleId: 'a' },
      { type: 'split', direction: 'horizontal', children: [
        { type: 'panel', moduleId: 'b' }, { type: 'panel', moduleId: 'c' },
      ] },
    ] }
    expect(normalize(n)).toEqual({ type: 'split', direction: 'horizontal', children: [
      { type: 'panel', moduleId: 'a' }, { type: 'panel', moduleId: 'b' }, { type: 'panel', moduleId: 'c' },
    ] })
  })
})

describe('removePanel', () => {
  it('removes a panel and collapses the resulting single-child split', () => {
    const n: LayoutNode = { type: 'split', direction: 'horizontal', children: [
      { type: 'panel', moduleId: 'a' }, { type: 'panel', moduleId: 'b' },
    ] }
    expect(removePanel(n, 'b')).toEqual({ type: 'panel', moduleId: 'a' })
  })
})

import { insertRelative, swapPanels } from './layoutTree'

const moved: LayoutNode = { type: 'panel', moduleId: 'x', draggable: true }

describe('insertRelative', () => {
  it('docks to the right of a lone panel → new horizontal split [target, moved]', () => {
    const t: LayoutNode = { type: 'panel', moduleId: 'a' }
    expect(insertRelative(t, 'a', moved, 'right')).toEqual({
      type: 'split', direction: 'horizontal',
      children: [{ type: 'panel', moduleId: 'a' }, moved],
    })
  })
  it('docks above → new vertical split [moved, target]', () => {
    const t: LayoutNode = { type: 'panel', moduleId: 'a' }
    expect(insertRelative(t, 'a', moved, 'top')).toEqual({
      type: 'split', direction: 'vertical',
      children: [moved, { type: 'panel', moduleId: 'a' }],
    })
  })
  it('docking on a sibling edge inside a matching split reorders (after normalize)', () => {
    const t: LayoutNode = { type: 'split', direction: 'horizontal', children: [
      { type: 'panel', moduleId: 'a' }, { type: 'panel', moduleId: 'b' },
    ] }
    expect(normalize(insertRelative(t, 'b', moved, 'left'))).toEqual({
      type: 'split', direction: 'horizontal',
      children: [{ type: 'panel', moduleId: 'a' }, moved, { type: 'panel', moduleId: 'b' }],
    })
  })
})

describe('swapPanels', () => {
  it('swaps two panels in place', () => {
    const t: LayoutNode = { type: 'split', direction: 'horizontal', children: [
      { type: 'panel', moduleId: 'a', draggable: true }, { type: 'panel', moduleId: 'b', draggable: true },
    ] }
    expect(swapPanels(t, 'a', 'b')).toEqual({ type: 'split', direction: 'horizontal', children: [
      { type: 'panel', moduleId: 'b', draggable: true }, { type: 'panel', moduleId: 'a', draggable: true },
    ] })
  })
})

import { move } from './layoutTree'

const base: LayoutNode = { type: 'split', direction: 'horizontal', children: [
  { type: 'panel', moduleId: 'explorer' },
  { type: 'panel', moduleId: 'chat', draggable: true },
  { type: 'panel', moduleId: 'editor', draggable: true },
] }

describe('move', () => {
  it('center = swap positions of two draggable panels', () => {
    const out = move(base, 'chat', 'editor', 'center')
    expect(collectModuleIds(out)).toEqual(['explorer', 'editor', 'chat'])
  })
  it('docking chat below editor creates a vertical split in editor\'s slot', () => {
    const out = move(base, 'chat', 'editor', 'bottom')
    expect(out).toEqual({ type: 'split', direction: 'horizontal', children: [
      { type: 'panel', moduleId: 'explorer' },
      { type: 'split', direction: 'vertical', children: [
        { type: 'panel', moduleId: 'editor', draggable: true },
        { type: 'panel', moduleId: 'chat', draggable: true },
      ] },
    ] })
  })
  it('refuses to move a locked source (returns the same reference)', () => {
    expect(move(base, 'explorer', 'chat', 'right')).toBe(base)
  })
  it('refuses to drop onto a locked target', () => {
    expect(move(base, 'chat', 'explorer', 'right')).toBe(base)
  })
  it('no-ops when source === target', () => {
    expect(move(base, 'chat', 'chat', 'right')).toBe(base)
  })
})

import { zoneFromRect } from './layoutTree'

const rect = { left: 0, top: 0, width: 100, height: 100 }

describe('zoneFromRect', () => {
  it('center when well inside', () => {
    expect(zoneFromRect(rect, { x: 50, y: 50 })).toBe('center')
  })
  it('edges within the threshold band', () => {
    expect(zoneFromRect(rect, { x: 5, y: 50 })).toBe('left')
    expect(zoneFromRect(rect, { x: 95, y: 50 })).toBe('right')
    expect(zoneFromRect(rect, { x: 50, y: 5 })).toBe('top')
    expect(zoneFromRect(rect, { x: 50, y: 95 })).toBe('bottom')
  })
  it('null when the point is outside the rect', () => {
    expect(zoneFromRect(rect, { x: -1, y: 50 })).toBeNull()
  })
})
