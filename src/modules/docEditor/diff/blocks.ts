import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import type { PendingChange } from '../../../core/proposalStore'
import type { DocEditPayload } from './types'

const processor = unified().use(remarkParse).use(remarkGfm)

export interface BlockSlice { source: string; start: number; end: number }

/** Slice markdown into its top-level blocks using remark source offsets. */
export function splitBlocks(markdown: string): BlockSlice[] {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const tree = processor.parse(markdown) as any
  const blocks: BlockSlice[] = []
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  for (const node of (tree.children ?? []) as any[]) {
    const start = node.position?.start?.offset ?? 0
    const end = node.position?.end?.offset ?? markdown.length
    blocks.push({ source: markdown.slice(start, end), start, end })
  }
  return blocks
}

export type PlacedItem =
  | { kind: 'static'; source: string }
  | { kind: 'change'; before: string; after: string; changes: PendingChange[] }
  | { kind: 'span'; change: PendingChange }

/**
 * Place each change into the document in reading order:
 * - `change`: one or more edits contained in a single block (paragraph/list/etc.); `after` is the
 *   block with all its edits applied, `changes` lists them in document order.
 * - `span`: an edit whose `find` straddles MORE THAN ONE block — shown as its own item where it
 *   starts (the blocks it covers are consumed), so it appears in place, not dumped elsewhere.
 * - `static`: an untouched block.
 * Only edits whose `find` is absent from the whole document go to `unplaced` (truly stale).
 */
export function placeChanges(
  text: string,
  changes: PendingChange[],
): { items: PlacedItem[]; unplaced: PendingChange[] } {
  const slices = splitBlocks(text)
  const unplaced: PendingChange[] = []
  const byBlock = new Map<number, PendingChange[]>()
  const spans: { change: PendingChange; first: number; last: number }[] = []

  for (const c of changes) {
    const { find } = c.payload as DocEditPayload
    const at = find === '' ? -1 : text.indexOf(find)
    if (at < 0) { unplaced.push(c); continue }
    const end = at + find.length
    const covered = slices.reduce<number[]>((acc, s, i) => (s.start < end && s.end > at ? [...acc, i] : acc), [])
    if (covered.length > 1) {
      spans.push({ change: c, first: covered[0], last: covered[covered.length - 1] })
    } else {
      const idx = covered.length === 1 ? covered[0] : slices.findIndex((b) => b.source.includes(find))
      if (idx < 0) { unplaced.push(c); continue }
      byBlock.set(idx, [...(byBlock.get(idx) ?? []), c])
    }
  }

  const items: PlacedItem[] = []
  const consumed = new Set<number>()
  for (let i = 0; i < slices.length; i++) {
    if (consumed.has(i)) continue
    const span = spans.find((sp) => sp.first === i)
    if (span) {
      items.push({ kind: 'span', change: span.change })
      for (let k = span.first; k <= span.last; k++) consumed.add(k)
      continue
    }
    const cs = byBlock.get(i)
    if (!cs || cs.length === 0) { items.push({ kind: 'static', source: slices[i].source }); continue }
    const ordered = [...cs].sort((x, y) =>
      slices[i].source.indexOf((x.payload as DocEditPayload).find) -
      slices[i].source.indexOf((y.payload as DocEditPayload).find),
    )
    let after = slices[i].source
    for (const c of ordered) {
      const { find, replace } = c.payload as DocEditPayload
      after = after.replace(find, () => replace)
    }
    items.push({ kind: 'change', before: slices[i].source, after, changes: ordered })
  }
  return { items, unplaced }
}
