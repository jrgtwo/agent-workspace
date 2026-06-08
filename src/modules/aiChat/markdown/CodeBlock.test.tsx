import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CodeBlock } from './CodeBlock'

describe('CodeBlock', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => {}) } })
  })

  it('shows a language tag derived from the className', () => {
    render(<CodeBlock className="hljs language-ts">const x = 1</CodeBlock>)
    expect(screen.getByText('ts')).toBeInTheDocument()
  })

  it('copies the code text when Copy is clicked', () => {
    render(<CodeBlock className="hljs language-ts">const x = 1</CodeBlock>)
    fireEvent.click(screen.getByRole('button', { name: /copy/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('const x = 1')
  })
})
