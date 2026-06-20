import { Emitter } from '../../core/emitter'
import type { LayoutNode } from '../../core/types'
import type { PanelRegistry } from '../../core/panelRegistry'
import { collectModuleIds, removePanel } from '../../core/layoutTree'

export interface ViewDef { id: string; name: string; icon: string; layout: LayoutNode; builtIn?: boolean }
export interface ViewsState { views: ViewDef[]; activeId?: string }

/** Drop any panel whose module id is absent from the registry; never returns null (keeps at least the tree). */
function pruneToRegistry(layout: LayoutNode, registry: PanelRegistry): LayoutNode {
  let next: LayoutNode | null = layout
  for (const id of collectModuleIds(layout)) {
    if (!registry.has(id) && next) next = removePanel(next, id)
  }
  return next ?? layout
}

export class ViewsStore extends Emitter<ViewsState> {
  private state: ViewsState
  private readonly registry: PanelRegistry
  private readonly builtInDefs: Map<string, ViewDef>

  constructor(builtIns: ViewDef[], registry: PanelRegistry) {
    super()
    this.registry = registry
    this.builtInDefs = new Map(builtIns.map((v) => [v.id, { ...v, builtIn: true }]))
    this.state = { views: builtIns.map((v) => ({ ...v, builtIn: true })), activeId: builtIns[0]?.id }
  }

  getState = (): ViewsState => this.state

  hydrate(state: ViewsState): void {
    const pruned = (state?.views ?? []).map((v) => ({ ...v, layout: pruneToRegistry(v.layout, this.registry) }))
    const have = new Set(pruned.map((v) => v.id))
    const missingBuiltIns = [...this.builtInDefs.values()].filter((b) => !have.has(b.id))
    const views = [...missingBuiltIns, ...pruned]
    this.state = { views, activeId: state?.activeId ?? views[0]?.id }
    this.notify()
  }

  setActive(id: string): void {
    this.state = { ...this.state, activeId: id }
    this.notify()
  }

  createView(name: string, layout: LayoutNode): string {
    const id = crypto.randomUUID()
    this.state = { views: [...this.state.views, { id, name, icon: '🧩', layout }], activeId: id }
    this.notify()
    return id
  }

  duplicateView(id: string): string {
    const src = this.state.views.find((v) => v.id === id)
    if (!src) return id
    return this.createView(`${src.name} copy`, src.layout)
  }

  renameView(id: string, name: string): void {
    this.state = { ...this.state, views: this.state.views.map((v) => (v.id === id ? { ...v, name } : v)) }
    this.notify()
  }

  deleteView(id: string): void {
    if (this.builtInDefs.has(id)) return
    const views = this.state.views.filter((v) => v.id !== id)
    const activeId = this.state.activeId === id ? views[0]?.id : this.state.activeId
    this.state = { views, activeId }
    this.notify()
  }

  updateLayout(id: string, layout: LayoutNode): void {
    this.state = { ...this.state, views: this.state.views.map((v) => (v.id === id ? { ...v, layout } : v)) }
    this.notify()
  }

  resetBuiltIn(id: string): void {
    const def = this.builtInDefs.get(id)
    if (def) this.updateLayout(id, def.layout)
  }
}
