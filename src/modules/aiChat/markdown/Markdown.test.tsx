import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Markdown } from './Markdown'

describe('Markdown', () => {
  it('renders headings, lists, links and inline code', () => {
    render(<Markdown>{'# Title\n\n- one\n- two\n\n[site](https://x.io) and `code`'}</Markdown>)
    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'site' })).toHaveAttribute('href', 'https://x.io')
    expect(screen.getByText('code')).toBeInTheDocument()
  })

  it('renders a GFM table', () => {
    render(<Markdown>{'| A | B |\n|---|---|\n| 1 | 2 |'}</Markdown>)
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'A' })).toBeInTheDocument()
  })

  it('renders a fenced code block with a copy button', () => {
    render(<Markdown>{'```ts\nconst x = 1\n```'}</Markdown>)
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })
})
