// src/modules/views/ViewArea.render.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ViewArea } from './ViewArea'
import { ViewsStore } from './viewsStore'
import { LayoutStore } from '../../core/layoutStore'
import { buildRegistry, type PanelType } from '../../core/panelRegistry'
import type { WorkspaceModule, LayoutNode } from '../../core/types'

const mod = (id: string, title: string): WorkspaceModule => ({ id, title, locality: 'LOCAL', tools: [], render: () => <div>{title} body</div> })
const reg = buildRegistry([
  { id: 'file-tree', label: 'File tree', icon: '📁', module: mod('file-tree', 'Tree') } as PanelType,
  { id: 'ai-chat', label: 'AI chat', icon: '💬', module: mod('ai-chat', 'Chat') } as PanelType,
])
const layout: LayoutNode = { type: 'panel', moduleId: 'file-tree', draggable: true }

describe('ViewArea', () => {
  it('renders the view panels and offers un-added panels in Add menu', () => {
    const vs = new ViewsStore([{ id: 'editor', name: 'Editor', icon: '🗂', layout, builtIn: true }], reg)
    const ls = new LayoutStore(layout)
    render(<ViewArea view={vs.getState().views[0]} viewsStore={vs} registry={reg} layoutStore={ls} />)
    expect(screen.getByText('Tree body')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /add panel/i }))
    expect(screen.getByRole('menuitem', { name: /AI chat/i })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /File tree/i })).toBeNull()
  })
})
