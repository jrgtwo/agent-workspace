import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KanbanApp } from './KanbanApp'
import { KanbanStore } from './kanbanStore'
import { KanbanNavStore } from './kanbanNavStore'
import { ProposalStore } from '../../core/proposalStore'
import { ProposalApplier } from '../../core/proposalApplier'

let seq = 0
const genId = () => `id-${++seq}`

function setup() {
  seq = 0
  const store = new KanbanStore(genId, () => 1)
  const nav = new KanbanNavStore()
  const proposals = new ProposalStore(genId)
  const applier = new ProposalApplier(proposals)
  const pid = store.createProject({ name: 'Proj' })
  nav.openBoard({ projectId: pid })
  return { store, nav, proposals, applier, pid }
}

describe('Kanban checklist cards', () => {
  it('builds a checklist in the editor and ticks items inline on the card', () => {
    const { store, nav, proposals, applier, pid } = setup()
    const col = store.columnsForScope({ projectId: pid })[0]
    const cardId = store.createCard({ projectId: pid }, col.id, { title: 'List' })
    render(<KanbanApp store={store} nav={nav} proposals={proposals} applier={applier} />)

    // open editor, switch to checklist, add two items
    fireEvent.click(screen.getByText('List'))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'checklist' } })
    const itemInput = screen.getByPlaceholderText('+ Add item')
    fireEvent.change(itemInput, { target: { value: 'Item A' } })
    fireEvent.submit(itemInput.closest('form')!)
    fireEvent.change(itemInput, { target: { value: 'Item B' } })
    fireEvent.submit(itemInput.closest('form')!)
    fireEvent.click(screen.getByText('Save'))

    // card shows progress + items
    expect(store.getCard(cardId)!.checklistItems!.map((i) => i.text)).toEqual(['Item A', 'Item B'])
    expect(screen.getByText('0/2')).toBeInTheDocument()

    // tick the first item inline
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    expect(store.getCard(cardId)!.checklistItems!.filter((i) => i.done)).toHaveLength(1)
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })
})
