import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBar } from './StatusBar'

describe('StatusBar', () => {
  it('shows READY when idle and no pending', () => {
    render(<StatusBar busy={false} pendingCount={0} />)
    expect(screen.getByText(/ready/i)).toBeInTheDocument()
  })
  it('shows streaming when busy', () => {
    render(<StatusBar busy pendingCount={0} />)
    expect(screen.getByText(/streaming/i)).toBeInTheDocument()
  })
  it('shows a waiting count when permissions pend', () => {
    render(<StatusBar busy={false} pendingCount={2} />)
    expect(screen.getByText(/2 waiting/i)).toBeInTheDocument()
  })
})
