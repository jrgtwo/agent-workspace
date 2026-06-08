/** Decide whether an Enter keypress should send: non-empty composer and not mid-run. */
export function shouldSend(markdown: string, busy: boolean): boolean {
  return markdown.trim().length > 0 && !busy
}
