import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Message } from './Message'

describe('Message', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => {}) } })
  })

  it('renders the markdown body and a role label', () => {
    render(<Message role="assistant" content={'**bold**'} />)
    expect(screen.getByText('bold')).toBeInTheDocument()
    expect(screen.getByText(/agent/i)).toBeInTheDocument()
  })

  it('copies the raw markdown source on copy click (assistant)', () => {
    render(<Message role="assistant" content={'# Hi'} />)
    fireEvent.click(screen.getByRole('button', { name: /copy/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('# Hi')
  })

  it('shows a blinking cursor affordance while streaming', () => {
    const { container } = render(<Message role="assistant" content={'typing'} streaming />)
    expect(container.querySelector('.chat-msg__cursor')).toBeInTheDocument()
  })
})
