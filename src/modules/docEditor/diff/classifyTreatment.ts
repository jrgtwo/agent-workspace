import { wordDiff } from './wordDiff'
import { toPlainText } from '../markdown/plainText'

export type Treatment = 'inline' | 'breakout'

/** Above this many total changed words, an edit is a sentence/paragraph swap → break it out. */
const MAX_INLINE_CHANGED_WORDS = 6

/**
 * Decide how a (non-code) change should be shown:
 * - `inline`: a small, localized change (few changed words total, single line) — show the word diff
 *   in place within the sentence. Works even in a long sentence where only a few words differ.
 * - `breakout`: a whole sentence/clause/paragraph was replaced (many changed words, or multi-line) —
 *   set it apart as an indented was/now block.
 *
 * We count TOTAL changed words (not the largest contiguous run): two different sentences often share
 * scattered small words ("the", "and"), which would otherwise split the change into tiny runs and
 * masquerade as a localized edit.
 */
export function classifyTreatment(find: string, replace: string): Treatment {
  if (find.includes('\n') || replace.includes('\n')) return 'breakout'
  const segs = wordDiff(toPlainText(find), toPlainText(replace))
  let changedWords = 0
  for (const s of segs) {
    if (s.type === 'same') continue
    changedWords += s.text.trim().split(/\s+/).filter(Boolean).length
  }
  return changedWords > MAX_INLINE_CHANGED_WORDS ? 'breakout' : 'inline'
}
