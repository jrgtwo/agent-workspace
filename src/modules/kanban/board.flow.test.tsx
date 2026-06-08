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

describe('Kanban board flows', () => {
  it('adds a description to a card through the editor', () => {
    const { store, nav, pid } = setup()
    const col = store.columnsForScope({ projectId: pid })[0]
    const cardId = store.createCard({ projectId: pid }, col.id, { title: 'My card' })
    render(<KanbanApp store={store} nav={nav} />)

    fireEvent.click(screen.getByText('My card'))
    fireEvent.change(screen.getByPlaceholderText('Add a description…'), {
      target: { value: 'Some details' },
    })
    fireEvent.click(screen.getByText('Save'))

    expect(store.getCard(cardId)!.notes).toBe('Some details')
    expect(screen.getByText('Some details')).toBeInTheDocument()
  })

  it('sets a due date on a card', () => {
    const { store, nav, pid } = setup()
    const col = store.columnsForScope({ projectId: pid })[0]
    const cardId = store.createCard({ projectId: pid }, col.id, { title: 'Ship' })
    const { container } = render(<KanbanApp store={store} nav={nav} />)

    fireEvent.click(screen.getByText('Ship'))
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2099-12-31' } })
    fireEvent.click(screen.getByText('Save'))

    expect(store.getCard(cardId)!.dueAt).toBe(new Date('2099-12-31T00:00:00').getTime())
    expect(container.querySelector('.kanban-card__due')).not.toBeNull()
  })

  it('creates a sub-board card and navigates into it', () => {
    const { store, nav, pid } = setup()
    const col = store.columnsForScope({ projectId: pid })[0]
    const cardId = store.createCard({ projectId: pid }, col.id, { title: 'Epic' })
    render(<KanbanApp store={store} nav={nav} />)

    // turn the card into a sub-board via the editor
    fireEvent.click(screen.getByText('Epic'))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'subboard' } })
    fireEvent.click(screen.getByText('Save'))

    // open the sub-board
    fireEvent.click(screen.getByText('Open board →'))
    expect(nav.activeScope()).toEqual({ projectId: pid, parentCardId: cardId })
    expect(store.columnsForScope({ projectId: pid, parentCardId: cardId })).toHaveLength(4)
    // breadcrumb shows the project as a clickable ancestor
    expect(screen.getByText('Proj')).toBeInTheDocument()
  })
})
