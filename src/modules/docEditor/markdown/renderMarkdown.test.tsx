import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MarkdownBlock, MarkdownInline } from './renderMarkdown'

describe('MarkdownBlock', () => {
  it('renders a heading as a real heading element', () => {
    const { container } = render(<MarkdownBlock source={'## Hello'} />)
    const h2 = container.querySelector('h2')
    expect(h2?.textContent).toBe('Hello')
  })

  it('renders bold and lists', () => {
    const { container } = render(<MarkdownBlock source={'- **a**\n- b'} />)
    expect(container.querySelector('ul')).toBeTruthy()
    expect(container.querySelector('strong')?.textContent).toBe('a')
  })

  it('renders an image element', () => {
    const { container } = render(<MarkdownBlock source={'![cat](cat.png)'} />)
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toBe('cat.png')
    expect(img?.getAttribute('alt')).toBe('cat')
  })

  it('renders a gfm table with header and cells', () => {
    const { container } = render(<MarkdownBlock source={'| a | b |\n|---|---|\n| 1 | 2 |'} />)
    expect(container.querySelector('table')).toBeTruthy()
    expect(container.querySelector('th')?.textContent).toBe('a')
    expect(container.querySelectorAll('td')).toHaveLength(2)
  })
})

describe('MarkdownInline', () => {
  it('renders inline content without a wrapping paragraph', () => {
    const { container } = render(<MarkdownInline source={'plain *em* text'} />)
    expect(container.querySelector('p')).toBeNull()
    expect(container.querySelector('em')?.textContent).toBe('em')
  })
})
