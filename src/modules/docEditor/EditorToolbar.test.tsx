import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorToolbar } from './EditorToolbar'
import type { MenuPick } from './milkdown/commands'

describe('EditorToolbar', () => {
  it('fires onCommand with block pick when Insert→Heading is clicked', async () => {
    const onCommand = vi.fn<(pick: MenuPick) => void>()
    render(<EditorToolbar onCommand={onCommand} />)
    await userEvent.click(screen.getByRole('button', { name: /insert/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /heading/i }))
    expect(onCommand).toHaveBeenCalledWith({ type: 'block', kind: 'heading' })
  })

  it('fires onCommand with inline pick when Bold is clicked', async () => {
    const onCommand = vi.fn<(pick: MenuPick) => void>()
    render(<EditorToolbar onCommand={onCommand} />)
    await userEvent.click(screen.getByRole('button', { name: /bold/i }))
    expect(onCommand).toHaveBeenCalledWith({ type: 'inline', kind: 'strong' })
  })

  it('fires onCommand with inline pick when Italic is clicked', async () => {
    const onCommand = vi.fn<(pick: MenuPick) => void>()
    render(<EditorToolbar onCommand={onCommand} />)
    await userEvent.click(screen.getByRole('button', { name: /italic/i }))
    expect(onCommand).toHaveBeenCalledWith({ type: 'inline', kind: 'em' })
  })

  it('closes the Insert menu after a block pick', async () => {
    const onCommand = vi.fn<(pick: MenuPick) => void>()
    render(<EditorToolbar onCommand={onCommand} />)
    await userEvent.click(screen.getByRole('button', { name: /insert/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('menuitem', { name: /code block/i }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(onCommand).toHaveBeenCalledWith({ type: 'block', kind: 'code' })
  })

  it('renders all expected block items in the Insert menu', async () => {
    render(<EditorToolbar onCommand={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /insert/i }))
    const labels = ['Heading', 'To-do list', 'Code block', 'Table', 'Quote', 'Divider']
    for (const label of labels) {
      expect(screen.getByRole('menuitem', { name: new RegExp(label, 'i') })).toBeInTheDocument()
    }
  })
})
