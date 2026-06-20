// src/modules/views/resolveView.ts
import type { LayoutNode, WorkspaceModule, FeatureManifest } from '../../core/types'
import type { PanelRegistry } from '../../core/panelRegistry'
import { collectModuleIds } from '../../core/layoutTree'

export function modulesForLayout(layout: LayoutNode, registry: PanelRegistry): WorkspaceModule[] {
  const seen = new Set<string>()
  const mods: WorkspaceModule[] = []
  for (const id of collectModuleIds(layout)) {
    if (seen.has(id)) continue
    const t = registry.get(id)
    if (t) { mods.push(t.module); seen.add(id) }
  }
  return mods
}

export function resolveView(
  view: { id: string; name: string; icon: string; layout: LayoutNode },
  registry: PanelRegistry,
): FeatureManifest {
  return { id: view.id, name: view.name, icon: view.icon, layout: view.layout, modules: modulesForLayout(view.layout, registry) }
}
