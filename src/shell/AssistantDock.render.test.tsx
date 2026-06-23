import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { AssistantDock } from './AssistantDock'
import { DockStore } from '../core/dockStore'
import { Emitter } from '../core/emitter'
import type { OrchestratorSessionStore } from '../modules/orchestrator/sessionStore'

afterEach(cleanup)

function fakeSessionStore() {
  class FakeSessionStore extends Emitter<{ sessions: Array<{ id: string; title: string; createdAt: number }>; activeId: string }> {
    private state = { sessions: [{ id: 'a', title: 'One', createdAt: 0 }], activeId: 'a' as const }
    getState = () => this.state
    create = () => {}
    setActive = () => {}
    delete = () => {}
  }
  return new FakeSessionStore() as unknown as OrchestratorSessionStore
}

function renderDock(dockStore = new DockStore()) {
  return render(
    <AssistantDock
      dockStore={dockStore}
      sessionStore={fakeSessionStore()}
      chat={() => <div>CHAT</div>}
      plan={() => <div>PLAN</div>}
      preview={() => <div>PREVIEW</div>}
    />,
  )
}

describe('AssistantDock', () => {
  it('renders the chat and no drawer by default', () => {
    renderDock()
    expect(screen.getByText('CHAT')).toBeInTheDocument()
    expect(screen.queryByText('PLAN')).not.toBeInTheDocument()
    expect(screen.queryByText('PREVIEW')).not.toBeInTheDocument()
  })

  it('opens the Plan drawer (exclusive of Preview)', () => {
    renderDock()
    fireEvent.click(screen.getByRole('button', { name: /^Plan$/i }))
    expect(screen.getByText('PLAN')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Preview$/i }))
    expect(screen.getByText('PREVIEW')).toBeInTheDocument()
    expect(screen.queryByText('PLAN')).not.toBeInTheDocument()
  })

  it('resizes via the separator drag (window.innerWidth - clientX, clamped)', () => {
    const dockStore = new DockStore()
    renderDock(dockStore)
    const dragTo = (clientX: number) =>
      act(() => { window.dispatchEvent(new MouseEvent('pointermove', { clientX })) })

    fireEvent.pointerDown(screen.getByLabelText('Resize assistant'))

    // window.innerWidth is 1024 in jsdom → 1024 - 500 = 524, inside [240, 720]
    dragTo(500)
    expect(dockStore.getState().width).toBe(524)
    // 1024 - 1000 = 24 → clamped up to 240
    dragTo(1000)
    expect(dockStore.getState().width).toBe(240)
  })

  it('collapses to a strip and re-expands', () => {
    const dockStore = new DockStore()
    renderDock(dockStore)
    fireEvent.click(screen.getByLabelText('Collapse assistant'))
    expect(screen.queryByText('CHAT')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Open assistant')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Open assistant'))
    expect(screen.getByText('CHAT')).toBeInTheDocument()
  })
})
