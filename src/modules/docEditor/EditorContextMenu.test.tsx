import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorContextMenu } from './EditorContextMenu'

describe('EditorContextMenu', () => {
  it('shows format actions when there is a selection', () => {
    render(<EditorContextMenu x={0} y={0} hasSelection onPick={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('menuitem', { name: /bold/i })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /heading/i })).not.toBeInTheDocument()
  })
  it('shows insert-block actions when there is no selection', () => {
    render(<EditorContextMenu x={0} y={0} hasSelection={false} onPick={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('menuitem', { name: /heading/i })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /bold/i })).not.toBeInTheDocument()
  })
  it('fires onPick with the chosen action id', async () => {
    const onPick = vi.fn()
    render(<EditorContextMenu x={0} y={0} hasSelection={false} onPick={onPick} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('menuitem', { name: /code block/i }))
    expect(onPick).toHaveBeenCalledWith({ type: 'block', kind: 'code' })
  })
})
