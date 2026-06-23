import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { DockSessionMenu } from './DockSessionMenu'
import { Emitter } from '../core/emitter'
import type { OrchestratorSessionStore } from '../modules/orchestrator/sessionStore'

afterEach(cleanup)

function fakeStore() {
  class FakeSessionStore extends Emitter<{ sessions: Array<{ id: string; title: string; createdAt: number }>; activeId: string }> {
    private state = { sessions: [{ id: 'a', title: 'One', createdAt: 0 }, { id: 'b', title: 'Two', createdAt: 0 }], activeId: 'a' as const }
    getState = () => this.state
    create = vi.fn()
    setActive = vi.fn()
    delete = vi.fn()
    rename = vi.fn()
  }
  return new FakeSessionStore() as unknown as OrchestratorSessionStore
}

describe('DockSessionMenu', () => {
  it('shows the active conversation title', () => {
    render(<DockSessionMenu store={fakeStore()} />)
    expect(screen.getByLabelText('conversations')).toHaveTextContent('One')
  })

  it('creates a new conversation', () => {
    const store = fakeStore()
    render(<DockSessionMenu store={store} />)
    fireEvent.click(screen.getByLabelText('new conversation'))
    expect(store.create).toHaveBeenCalledTimes(1)
  })

  it('switches conversation from the list', () => {
    const store = fakeStore()
    render(<DockSessionMenu store={store} />)
    fireEvent.click(screen.getByLabelText('conversations'))
    fireEvent.click(screen.getByRole('button', { name: 'Two' }))
    expect(store.setActive).toHaveBeenCalledWith('b')
  })

  it('toggle button reflects expanded state', () => {
    render(<DockSessionMenu store={fakeStore()} />)
    const btn = screen.getByLabelText('conversations')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })

  it('double-clicking an item opens a rename input seeded with the title', () => {
    render(<DockSessionMenu store={fakeStore()} />)
    fireEvent.click(screen.getByLabelText('conversations'))
    fireEvent.doubleClick(screen.getByRole('button', { name: 'One' }))
    expect(screen.getByLabelText('rename conversation')).toHaveValue('One')
  })

  it('renames on Enter and closes the input', () => {
    const store = fakeStore()
    render(<DockSessionMenu store={store} />)
    fireEvent.click(screen.getByLabelText('conversations'))
    fireEvent.doubleClick(screen.getByRole('button', { name: 'One' }))
    const input = screen.getByLabelText('rename conversation')
    fireEvent.change(input, { target: { value: 'Renamed' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(store.rename).toHaveBeenCalledWith('a', 'Renamed')
    expect(screen.queryByLabelText('rename conversation')).not.toBeInTheDocument()
  })
})
