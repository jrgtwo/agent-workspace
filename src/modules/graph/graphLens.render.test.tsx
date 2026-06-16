import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EntityStore } from './entityStore'
import { createGraphLensModule } from './graphLensModule'

const ids = () => { let n = 0; return () => `e${++n}` }

function seeded() {
  const store = new EntityStore(ids())
  const a = store.create({ type: 'task', title: 'Draft brief', status: 'To Do' })
  const b = store.create({ type: 'task', title: 'Review brief', status: 'Doing' })
  store.link(b, a) // Review → Draft (so Draft has a backlink)
  return { store, a, b }
}

describe('graph lens', () => {
  it('renders entities in the list view', () => {
    const { store } = seeded()
    render(createGraphLensModule(store).render())
    expect(screen.getByText('Draft brief')).toBeInTheDocument()
    expect(screen.getByText('Review brief')).toBeInTheDocument()
  })

  it('switches to the board view and shows status columns', () => {
    const { store } = seeded()
    render(createGraphLensModule(store).render())
    fireEvent.click(screen.getByRole('tab', { name: 'Board' }))
    expect(screen.getByText('To Do')).toBeInTheDocument()
    expect(screen.getByText('Doing')).toBeInTheDocument()
  })

  it('selecting an entity opens the inspector with its backlinks', () => {
    const { store } = seeded()
    render(createGraphLensModule(store).render())
    fireEvent.click(screen.getByText('Draft brief'))
    const inspector = screen.getByLabelText('inspector')
    // "Review brief" links TO "Draft brief", so it appears under Backlinks
    expect(inspector).toHaveTextContent('Review brief')
  })
})
