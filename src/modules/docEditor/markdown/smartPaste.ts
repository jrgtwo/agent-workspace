import TurndownService from 'turndown'

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
const URL_RE = /^https?:\/\/\S+$/

export interface PasteData { text: string; html: string }

/** Decide what markdown to insert for a paste, given the current selection text. */
export function pasteToMarkdown(data: PasteData, selection: string): string {
  const text = data.text.trim()
  if (URL_RE.test(text)) {
    return selection ? `[${selection}](${text})` : text
  }
  if (data.html && data.html.trim()) {
    return turndown.turndown(data.html).trim()
  }
  return data.text
}
