/** Markdown reference for a locally-stored image blob. The `blob:<id>` scheme is resolved
 *  to a local object URL at render time (no network). */
export function imageMarkdown(blobId: string, name: string): string {
  return `![${name || 'image'}](blob:${blobId})`
}
