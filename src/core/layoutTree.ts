import type { LayoutNode } from './types'

export type PanelNode = Extract<LayoutNode, { type: 'panel' }>
export type Zone = 'left' | 'right' | 'top' | 'bottom' | 'center'

/** All panel moduleIds, depth-first. */
export function collectModuleIds(node: LayoutNode): string[] {
  if (node.type === 'panel') return [node.moduleId]
  return node.children.flatMap(collectModuleIds)
}

/** The panel node with this moduleId, or null. */
export function findPanel(node: LayoutNode, moduleId: string): PanelNode | null {
  if (node.type === 'panel') return node.moduleId === moduleId ? node : null
  for (const child of node.children) {
    const found = findPanel(child, moduleId)
    if (found) return found
  }
  return null
}

/** Canonicalize: drop empty splits, merge same-direction nesting, collapse single-child splits. */
export function normalize(node: LayoutNode): LayoutNode {
  if (node.type === 'panel') return node
  const children = node.children
    .map(normalize)
    .filter((c) => !(c.type === 'split' && c.children.length === 0))
    .flatMap((c) => (c.type === 'split' && c.direction === node.direction ? c.children : [c]))
  if (children.length === 1) return children[0]
  return { ...node, children }
}

/** Remove a panel, then normalize. Returns the (possibly collapsed) tree, or null if the whole tree was that panel. */
export function removePanel(node: LayoutNode, moduleId: string): LayoutNode | null {
  if (node.type === 'panel') return node.moduleId === moduleId ? null : node
  const children = node.children
    .map((c) => removePanel(c, moduleId))
    .filter((c): c is LayoutNode => c !== null)
  return normalize({ ...node, children })
}

/** Place `moved` beside the target panel per `zone` (edge zones only). Wrap the target in a new split;
 *  `normalize` later merges it into the parent when directions match (→ reorder within a container). */
export function insertRelative(node: LayoutNode, targetId: string, moved: LayoutNode, zone: Zone): LayoutNode {
  if (zone === 'center') return node // center is handled by swap in move(); no-op here
  const direction = zone === 'left' || zone === 'right' ? 'horizontal' : 'vertical'
  const before = zone === 'left' || zone === 'top'
  const wrap = (target: LayoutNode): LayoutNode => ({
    type: 'split', direction, children: before ? [moved, target] : [target, moved],
  })
  const go = (n: LayoutNode): LayoutNode => {
    if (n.type === 'panel') return n.moduleId === targetId ? wrap(n) : n
    return { ...n, children: n.children.map(go) }
  }
  return go(node)
}

/** Swap the positions of two panels in the tree. */
export function swapPanels(node: LayoutNode, aId: string, bId: string): LayoutNode {
  const a = findPanel(node, aId)
  const b = findPanel(node, bId)
  if (!a || !b) return node
  const go = (n: LayoutNode): LayoutNode => {
    if (n.type === 'panel') return n.moduleId === aId ? b : n.moduleId === bId ? a : n
    return { ...n, children: n.children.map(go) }
  }
  return go(node)
}

/** Move `sourceId` relative to `targetId` by `zone`. Returns the SAME reference when the move is invalid
 *  (locked source/target, missing node, or source===target) so callers can skip notifying. */
export function move(tree: LayoutNode, sourceId: string, targetId: string, zone: Zone): LayoutNode {
  if (sourceId === targetId) return tree
  const src = findPanel(tree, sourceId)
  const tgt = findPanel(tree, targetId)
  if (!src || !tgt) return tree
  if (!src.draggable || !tgt.draggable) return tree // fixed anchors: not movable, not droppable-onto
  if (zone === 'center') return normalize(swapPanels(tree, sourceId, targetId))
  const removed = removePanel(tree, sourceId)
  if (!removed) return tree
  return normalize(insertRelative(removed, targetId, src, zone))
}

export interface Rect { left: number; top: number; width: number; height: number }
export interface Point { x: number; y: number }

/** Map a point within a rect to a drop zone. `edge` is the fraction (0–0.5) of each side that counts
 *  as an edge band; the inner remainder is `center`. Returns null if the point is outside the rect. */
export function zoneFromRect(rect: Rect, point: Point, edge = 0.25): Zone | null {
  const fx = (point.x - rect.left) / rect.width
  const fy = (point.y - rect.top) / rect.height
  if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null
  const d = { left: fx, right: 1 - fx, top: fy, bottom: 1 - fy }
  const min = Math.min(d.left, d.right, d.top, d.bottom)
  if (min > edge) return 'center'
  if (min === d.left) return 'left'
  if (min === d.right) return 'right'
  if (min === d.top) return 'top'
  return 'bottom'
}
