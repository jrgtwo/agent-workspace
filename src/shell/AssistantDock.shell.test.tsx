// src/shell/AssistantDock.shell.test.tsx
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { WorkspaceShell } from './WorkspaceShell'
import { ThemeStore } from '../core/themeStore'
import { LayoutStore } from '../core/layoutStore'
import { DockStore } from '../core/dockStore'
import { Emitter } from '../core/emitter'
import { ViewsStore } from '../modules/views/viewsStore'
import { buildRegistry, type PanelType } from '../core/panelRegistry'
import type { AssistantDockProps } from './AssistantDock'
import type { FeatureManifest, WorkspaceModule, LayoutNode } from '../core/types'
import type { OrchestratorSessionStore } from '../modules/orchestrator/sessionStore'

afterEach(() => { cleanup(); document.documentElement.removeAttribute('data-theme') })

const mod = (id: string, body: string): WorkspaceModule => ({ id, title: id, locality: 'LOCAL', tools: [], render: () => <div>{body}</div> })
const feature: FeatureManifest = { id: 'notes', name: 'Notes', icon: '📝', layout: { type: 'panel', moduleId: 'm' }, modules: [mod('m', 'NOTES')] }
const reg = buildRegistry([{ id: 'file-tree', label: 'File tree', icon: '📁', module: mod('file-tree', 'TREE') } as PanelType])
const viewLayout: LayoutNode = { type: 'panel', moduleId: 'file-tree', draggable: true }

function fakeSessionStore(): OrchestratorSessionStore {
  class FakeSessionStore extends Emitter<{ sessions: Array<{ id: string; title: string; createdAt: number }>; activeId: string }> {
    private state = { sessions: [{ id: 'a', title: 'One', createdAt: 0 }], activeId: 'a' as const }
    getState = () => this.state
    create = () => {}
    setActive = () => {}
    delete = () => {}
  }
  return new FakeSessionStore() as unknown as OrchestratorSessionStore
}

function dockProps(): AssistantDockProps {
  return { dockStore: new DockStore(), sessionStore: fakeSessionStore(), chat: () => <div>DOCKCHAT</div>, plan: () => <div>P</div>, preview: () => <div>V</div> }
}

describe('WorkspaceShell with the Assistant dock', () => {
  it('shows the dock over a legacy feature', () => {
    const layoutStores = new Map([['notes', new LayoutStore(feature.layout)]])
    render(<WorkspaceShell features={[feature]} theme={new ThemeStore()} layoutStores={layoutStores} dock={dockProps()} />)
    expect(screen.getByText('NOTES')).toBeInTheDocument()
    expect(screen.getByText('DOCKCHAT')).toBeInTheDocument()
  })

  it('shows the dock over a composable view too', () => {
    const vs = new ViewsStore([{ id: 'editor', name: 'Editor', icon: '🗂', layout: viewLayout, builtIn: true }], reg)
    const layoutStores = new Map([['notes', new LayoutStore(feature.layout)]])
    render(<WorkspaceShell features={[feature]} theme={new ThemeStore()} layoutStores={layoutStores} viewsStore={vs} registry={reg} dock={dockProps()} />)
    fireEvent.click(screen.getByRole('button', { name: /Editor/i }))
    expect(screen.getByText('TREE')).toBeInTheDocument()
    expect(screen.getByText('DOCKCHAT')).toBeInTheDocument()
  })
})
