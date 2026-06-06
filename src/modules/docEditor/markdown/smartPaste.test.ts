import { describe, it, expect } from 'vitest'
import { pasteToMarkdown } from './smartPaste'

describe('pasteToMarkdown', () => {
  it('wraps a pasted URL as a link around the selection', () => {
    expect(pasteToMarkdown({ text: 'https://x.com', html: '' }, 'click here')).toBe('[click here](https://x.com)')
  })
  it('passes a pasted URL through when there is no selection', () => {
    expect(pasteToMarkdown({ text: 'https://x.com', html: '' }, '')).toBe('https://x.com')
  })
  it('converts pasted HTML to markdown', () => {
    expect(pasteToMarkdown({ text: 'Bold', html: '<b>Bold</b>' }, '')).toBe('**Bold**')
  })
  it('passes plain text through unchanged', () => {
    expect(pasteToMarkdown({ text: 'just text', html: '' }, '')).toBe('just text')
  })
})
