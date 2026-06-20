import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WorkspaceShell } from './WorkspaceShell'
import { ViewsStore } from '../modules/views/viewsStore'
import { buildRegistry, type PanelType } from '../core/panelRegistry'
import { LayoutStore } from '../core/layoutStore'
import { ThemeStore } from '../core/themeStore'
import type { FeatureManifest, WorkspaceModule, LayoutNode } from '../core/types'

const mod = (id: string, body: string): WorkspaceModule => ({ id, title: id, locality: 'LOCAL', tools: [], render: () => <div>{body}</div> })
const reg = buildRegistry([{ id: 'file-tree', label: 'File tree', icon: '📁', module: mod('file-tree', 'TREE') } as PanelType])
const viewLayout: LayoutNode = { type: 'panel', moduleId: 'file-tree', draggable: true }
const feature: FeatureManifest = { id: 'notes', name: 'Notes', icon: '📝', layout: { type: 'panel', moduleId: 'm' }, modules: [mod('m', 'NOTES')] }

describe('WorkspaceShell with views', () => {
  it('switches to a view and renders its panels', () => {
    const vs = new ViewsStore([{ id: 'editor', name: 'Editor', icon: '🗂', layout: viewLayout, builtIn: true }], reg)
    const layoutStores = new Map([['notes', new LayoutStore(feature.layout)]])
    render(<WorkspaceShell features={[feature]} theme={new ThemeStore()} layoutStores={layoutStores} viewsStore={vs} registry={reg} />)
    expect(screen.getByText('NOTES')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Editor/i }))
    expect(screen.getByText('TREE')).toBeInTheDocument()
  })
})
