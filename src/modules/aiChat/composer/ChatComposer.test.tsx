import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatComposer } from './ChatComposer'

describe('ChatComposer buttons', () => {
  it('shows Stop while busy and calls onStop', () => {
    const onStop = vi.fn()
    render(<ChatComposer busy onSend={vi.fn()} onStop={onStop} />)
    fireEvent.click(screen.getByRole('button', { name: /stop/i }))
    expect(onStop).toHaveBeenCalledTimes(1)
  })
  it('shows Send when idle', () => {
    render(<ChatComposer busy={false} onSend={vi.fn()} onStop={vi.fn()} />)
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })
})
