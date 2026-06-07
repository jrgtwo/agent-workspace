import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'

const processor = unified().use(remarkParse).use(remarkGfm)

/** Strip markdown to readable plain text (drops syntax like ** _ #, keeps code/text). */
export function toPlainText(source: string): string {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const tree = processor.parse(source) as any
  let out = ''
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const walk = (n: any) => {
    if (typeof n.value === 'string') out += n.value
    if (Array.isArray(n.children)) n.children.forEach(walk)
    // separate block-level nodes so words don't run together
    if (n.type === 'paragraph' || n.type === 'heading' || n.type === 'listItem') out += ' '
  }
  ;(tree.children ?? []).forEach(walk)
  return out.replace(/\s+/g, ' ').trim()
}
