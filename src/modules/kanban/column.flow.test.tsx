import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KanbanApp } from './KanbanApp'
import { KanbanStore } from './kanbanStore'
import { KanbanNavStore } from './kanbanNavStore'

let seq = 0
const genId = () => `id-${++seq}`

function setup() {
  seq = 0
  const store = new KanbanStore(genId, () => 1)
  const nav = new KanbanNavStore()
  const pid = store.createProject({ name: 'Proj' })
  nav.openBoard({ projectId: pid })
  return { store, nav, pid }
}

describe('Kanban column management', () => {
  it('adds a column', () => {
    const { store, nav, pid } = setup()
    render(<KanbanApp store={store} nav={nav} />)

    fireEvent.click(screen.getByText('+ Add column'))
    const input = screen.getByPlaceholderText('Column name')
    fireEvent.change(input, { target: { value: 'Ideas' } })
    fireEvent.blur(input)

    expect(store.columnsForScope({ projectId: pid }).map((c) => c.name)).toContain('Ideas')
    expect(screen.getByText('Ideas')).toBeInTheDocument()
  })

  it('renames a column inline', () => {
    const { store, nav, pid } = setup()
    render(<KanbanApp store={store} nav={nav} />)

    fireEvent.dblClick(screen.getByText('Backlog'))
    const input = screen.getByDisplayValue('Backlog')
    fireEvent.change(input, { target: { value: 'Todo' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(store.columnsForScope({ projectId: pid }).map((c) => c.name)).toContain('Todo')
    expect(screen.queryByText('Backlog')).toBeNull()
  })

  it('deletes a column', () => {
    const { store, nav, pid } = setup()
    render(<KanbanApp store={store} nav={nav} />)

    fireEvent.click(screen.getByLabelText('Delete column In Progress'))

    expect(store.columnsForScope({ projectId: pid }).map((c) => c.name)).not.toContain('In Progress')
    expect(screen.queryByText('In Progress')).toBeNull()
  })
})
