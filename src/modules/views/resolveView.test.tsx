// src/modules/views/resolveView.test.tsx
import { describe, it, expect } from 'vitest'
import { buildRegistry, type PanelType } from '../../core/panelRegistry'
import type { WorkspaceModule, LayoutNode } from '../../core/types'
import { modulesForLayout, resolveView } from './resolveView'

const mod = (id: string): WorkspaceModule => ({ id, title: id, locality: 'LOCAL', tools: [], render: () => <div /> })
const reg = buildRegistry([
  { id: 'file-tree', label: 'File tree', icon: '📁', module: mod('file-tree') } as PanelType,
  { id: 'ai-chat', label: 'AI chat', icon: '💬', module: mod('ai-chat') } as PanelType,
])
const layout: LayoutNode = {
  type: 'split', direction: 'horizontal',
  children: [{ type: 'panel', moduleId: 'file-tree' }, { type: 'panel', moduleId: 'ai-chat' }],
}

describe('resolveView', () => {
  it('maps layout module ids to registry modules', () => {
    const mods = modulesForLayout(layout, reg)
    expect(mods.map((m) => m.id)).toEqual(['file-tree', 'ai-chat'])
  })
  it('drops module ids not in the registry', () => {
    const bad: LayoutNode = { type: 'panel', moduleId: 'ghost' }
    expect(modulesForLayout(bad, reg)).toEqual([])
  })
  it('builds a FeatureManifest', () => {
    const m = resolveView({ id: 'v1', name: 'Editor', icon: '🗂', layout }, reg)
    expect(m).toMatchObject({ id: 'v1', name: 'Editor', icon: '🗂', layout })
    expect(m.modules.map((x) => x.id)).toEqual(['file-tree', 'ai-chat'])
  })
})
