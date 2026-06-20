import { Emitter } from './emitter'
import type { LayoutNode } from './types'
import { collectModuleIds, insertRelative, move as moveNode, normalize, removePanel, type Zone } from './layoutTree'

function sameModuleSet(a: LayoutNode, b: LayoutNode): boolean {
  const sa = new Set(collectModuleIds(a))
  const sb = new Set(collectModuleIds(b))
  return sa.size === sb.size && [...sa].every((id) => sb.has(id))
}

/** Re-apply the author's `draggable` flags (from the default) onto a tree by moduleId. */
function restampDraggable(node: LayoutNode, flags: Map<string, boolean | undefined>): LayoutNode {
  if (node.type === 'panel') return { ...node, draggable: flags.get(node.moduleId) }
  return { ...node, children: node.children.map((c) => restampDraggable(c, flags)) }
}

function draggableFlags(node: LayoutNode, into = new Map<string, boolean | undefined>()): Map<string, boolean | undefined> {
  if (node.type === 'panel') into.set(node.moduleId, node.draggable)
  else node.children.forEach((c) => draggableFlags(c, into))
  return into
}

/** Keep the saved arrangement only if its panel set matches the default; otherwise fall back to default.
 *  Draggability is always re-stamped from the default so the author stays authoritative over the flag. */
export function reconcile(saved: LayoutNode | undefined, def: LayoutNode): LayoutNode {
  if (!saved || !sameModuleSet(saved, def)) return def
  return restampDraggable(saved, draggableFlags(def))
}

export interface LayoutState { layout: LayoutNode }

export class LayoutStore extends Emitter<LayoutState> {
  private state: LayoutState
  private readonly def: LayoutNode

  constructor(defaultLayout: LayoutNode) {
    super()
    this.def = defaultLayout
    this.state = { layout: defaultLayout }
  }

  getState = (): LayoutState => this.state

  hydrate(state: LayoutState): void {
    this.state = { layout: reconcile(state?.layout, this.def) }
    this.notify()
  }

  move(sourceId: string, targetId: string, zone: Zone): void {
    const next = moveNode(this.state.layout, sourceId, targetId, zone)
    if (next === this.state.layout) return
    this.state = { layout: next }
    this.notify()
  }

  addPanel(moduleId: string): void {
    const ids = collectModuleIds(this.state.layout)
    if (ids.includes(moduleId)) return
    const anchor = ids[ids.length - 1]
    const moved: LayoutNode = { type: 'panel', moduleId, draggable: true }
    const next = normalize(insertRelative(this.state.layout, anchor, moved, 'right'))
    this.state = { layout: next }
    this.notify()
  }

  removePanelById(moduleId: string): void {
    const ids = collectModuleIds(this.state.layout)
    if (ids.length <= 1) return
    if (!ids.includes(moduleId)) return
    const next = removePanel(this.state.layout, moduleId)
    if (!next) return
    this.state = { layout: next }
    this.notify()
  }

  reset(): void {
    this.state = { layout: this.def }
    this.notify()
  }
}
