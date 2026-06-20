import { describe, it, expect } from 'vitest'
import { buildRegistry, type PanelType } from './panelRegistry'
import type { WorkspaceModule } from './types'

const mod = (id: string): WorkspaceModule => ({ id, title: id, locality: 'LOCAL', tools: [], render: () => <div /> })

describe('buildRegistry', () => {
  it('indexes panel types by id', () => {
    const t: PanelType = { id: 'file-tree', label: 'File tree', icon: '📁', module: mod('file-tree') }
    const reg = buildRegistry([t])
    expect(reg.get('file-tree')).toBe(t)
    expect(reg.get('nope')).toBeUndefined()
  })
})
