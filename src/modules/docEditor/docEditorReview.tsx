import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { PendingChange } from '../../core/proposalStore'
import type { DocEditPayload, Segment } from './diff/types'
import { placeChanges, countOccurrences } from './diff/blocks'
import { wordDiff } from './diff/wordDiff'
import { classifyTreatment } from './diff/classifyTreatment'
import { MarkdownBlock, MarkdownInline } from './markdown/renderMarkdown'
import { toPlainText } from './markdown/plainText'
import './docEditorReview.css'

export type { DocEditPayload }

/** Lets each change register its element, know if it's the navigated-to ("current") one, and learn
 *  if its `find` matches more than one place in the document (ambiguous → may target the wrong one). */
const NavContext = createContext<{
  currentId: string | null
  register: (id: string, el: HTMLElement | null) => void
  ambiguous: Map<string, number>
}>({ currentId: null, register: () => {}, ambiguous: new Map() })

function useNav(id: string) {
  const { currentId, register, ambiguous } = useContext(NavContext)
  return { isCurrent: id === currentId, ref: (el: HTMLElement | null) => register(id, el), ambiguousCount: ambiguous.get(id) }
}

/** Warns that this edit's `find` text occurs more than once, so it may target the wrong spot. */
function AmbiguityWarn({ n }: { n: number }) {
  return (
    <span className="diff-warn" tabIndex={0} aria-label="ambiguous match">
      ⚠<span className="diff-why__pop">This text appears {n} times in the document — this targets the first match. Reject and re-ask if it's the wrong one.</span>
    </span>
  )
}

/** A fenced code block — shown as code, not prose. */
function isCodeBlock(source: string): boolean {
  const t = source.trimStart()
  return t.startsWith('```') || t.startsWith('~~~')
}

/** A backtick-wrapped inline code span, e.g. `foo`. */
function isInlineCode(s: string): boolean {
  const t = s.trim()
  return t.length >= 2 && t.startsWith('`') && t.endsWith('`') && !t.slice(1, -1).includes('`')
}

/** Strip the opening/closing fence lines of a fenced code block, leaving the inner code. */
function stripFence(source: string): string {
  const lines = source.replace(/\s+$/, '').split('\n')
  if (lines.length && /^\s*(```|~~~)/.test(lines[0])) lines.shift()
  if (lines.length && /^\s*(```|~~~)\s*$/.test(lines[lines.length - 1])) lines.pop()
  return lines.join('\n')
}

/** Render word-diff segments inline: unchanged plain, removed red+strike, added green. */
function segNodes(segs: Segment[]) {
  return segs.map((s, i) => {
    if (s.type === 'del') return <span key={i} className="diff-del">{s.text}</span>
    if (s.type === 'add') return <span key={i} className="diff-add">{s.text}</span>
    return <span key={i}>{s.text}</span>
  })
}

function Controls({ onAccept, onReject }: { onAccept: () => void; onReject: () => void }) {
  return (
    <span className="diff-ctrl">
      <button className="btn btn--icon" aria-label="Accept this change" onClick={onAccept}>✓</button>
      <button className="btn btn--icon" aria-label="Reject this change" onClick={onReject}>✗</button>
    </span>
  )
}

/** The reason, revealed on hover/focus of the ⓘ marker. */
function WhyHover({ reason }: { reason: string }) {
  return (
    <span className="diff-why" tabIndex={0} aria-label="why">
      ⓘ<span className="diff-why__pop"><b>Why:</b> {reason}</span>
    </span>
  )
}

/** Small localized change: the word diff shown in place within the sentence. */
function InlineChange({ id, find, replace, reason, onAccept, onReject }: {
  id: string; find: string; replace: string; reason: string; onAccept: () => void; onReject: () => void
}) {
  const segs = wordDiff(toPlainText(find), toPlainText(replace))
  const code = isInlineCode(find) || isInlineCode(replace)
  const { isCurrent, ref, ambiguousCount } = useNav(id)
  const cls = ['i-change', code && 'i-change--code', isCurrent && 'is-current'].filter(Boolean).join(' ')
  return (
    <span ref={ref} className={cls}>{segNodes(segs)}<Controls onAccept={onAccept} onReject={onReject} /><WhyHover reason={reason} />{ambiguousCount ? <AmbiguityWarn n={ambiguousCount} /> : null}</span>
  )
}

/** A whole sentence/clause/paragraph replaced — set apart as labelled was/now (or added/removed). */
function BreakoutChange({ id, find, replace, reason, onAccept, onReject }: {
  id: string; find: string; replace: string; reason: string; onAccept: () => void; onReject: () => void
}) {
  const segs = wordDiff(toPlainText(find), toPlainText(replace))
  const delRuns = segs.filter((s) => s.type === 'del' && s.text.trim().length > 0).length
  const addRuns = segs.filter((s) => s.type === 'add' && s.text.trim().length > 0).length
  const join = (t: Segment['type']) => segs.filter((s) => s.type === t).map((s) => s.text).join('').trim()

  let rows
  if (addRuns === 1 && delRuns === 0) {
    // a single contiguous insertion — show just the added text
    rows = <div className="row"><span className="lab">added</span><span className="new">{join('add')}</span></div>
  } else if (delRuns === 1 && addRuns === 0) {
    // a single contiguous deletion — show just the removed text
    rows = <div className="row"><span className="lab">removed</span><span className="old">{join('del')}</span></div>
  } else {
    // mixed/structural change — render the actual markdown (lists stay lists) tinted was/now
    rows = (
      <>
        <div className="row"><span className="lab">was</span><div className="old old--block"><MarkdownBlock source={find} /></div></div>
        <div className="row"><span className="lab">now</span><div className="new new--block"><MarkdownBlock source={replace} /></div></div>
      </>
    )
  }
  const { isCurrent, ref, ambiguousCount } = useNav(id)
  return (
    <div ref={ref} className={isCurrent ? 'edit is-current' : 'edit'}>
      {rows}
      <div className="edit__foot"><Controls onAccept={onAccept} onReject={onReject} /><WhyHover reason={reason} />{ambiguousCount ? <AmbiguityWarn n={ambiguousCount} /> : null}</div>
    </div>
  )
}

/** A fenced code block change: word-level diff of the code, monospace, in place. */
function CodeChange({ before, after, changes, onAccept, onReject }: {
  before: string; after: string; changes: PendingChange[]
  onAccept: (c: PendingChange) => void; onReject: (c: PendingChange) => void
}) {
  const segs = wordDiff(stripFence(before), stripFence(after))
  const { currentId, register } = useContext(NavContext)
  const isCurrent = changes.some((c) => c.id === currentId)
  return (
    <div ref={(el) => changes.forEach((c) => register(c.id, el))} className={isCurrent ? 'code-edit is-current' : 'code-edit'}>
      <pre className="code-edit__body">{segNodes(segs)}</pre>
      {changes.map((c) => (
        <span key={c.id} className="edit__foot">
          <Controls onAccept={() => onAccept(c)} onReject={() => onReject(c)} />
          <WhyHover reason={(c.payload as DocEditPayload).reason} />
        </span>
      ))}
    </div>
  )
}

/** Render one changed block: code as a code diff; prose by walking the source and placing each
 *  change (inline or breakout) at its `find`, with the unchanged text rendered as markdown around it. */
function ChangedBlock({ before, after, changes, onAccept, onReject }: {
  before: string; after: string; changes: PendingChange[]
  onAccept: (c: PendingChange) => void; onReject: (c: PendingChange) => void
}) {
  if (isCodeBlock(before) || isCodeBlock(after)) {
    return <CodeChange before={before} after={after} changes={changes} onAccept={onAccept} onReject={onReject} />
  }
  const nodes: ReactNode[] = []
  let cursor = 0
  changes.forEach((c, idx) => {
    const { find, replace, reason } = c.payload as DocEditPayload
    const at = before.indexOf(find, cursor)
    if (at < 0) {
      // couldn't place (e.g. overlaps a prior change) — fall back to a break-out at the end
      nodes.push(<BreakoutChange key={c.id} id={c.id} find={find} replace={replace} reason={reason} onAccept={() => onAccept(c)} onReject={() => onReject(c)} />)
      return
    }
    if (at > cursor) nodes.push(<MarkdownInline key={`p${idx}`} source={before.slice(cursor, at)} />)
    const props = { id: c.id, find, replace, reason, onAccept: () => onAccept(c), onReject: () => onReject(c) }
    nodes.push(
      classifyTreatment(find, replace) === 'inline'
        ? <InlineChange key={c.id} {...props} />
        : <BreakoutChange key={c.id} {...props} />,
    )
    cursor = at + find.length
  })
  if (cursor < before.length) nodes.push(<MarkdownInline key="ptail" source={before.slice(cursor)} />)
  return <div className="review-para">{nodes}</div>
}

export function ReviewPanel({ text, changes, onAccept, onReject, onAcceptAll, onRejectAll }: {
  text: string
  changes: PendingChange[]
  onAccept: (c: PendingChange) => void
  onReject: (c: PendingChange) => void
  onAcceptAll: () => void
  onRejectAll: () => void
}) {
  const { items, unplaced } = placeChanges(text, changes)

  // edits in document order, for prev/next navigation
  const orderedIds: string[] = []
  for (const item of items) {
    if (item.kind === 'change') orderedIds.push(...item.changes.map((c) => c.id))
    else if (item.kind === 'span') orderedIds.push(item.change.id)
  }
  for (const c of unplaced) orderedIds.push(c.id)

  // `selectedId` is the user's chosen edit; if it's been accepted/rejected away, fall back to the
  // first edit. Deriving `currentId` during render avoids clamping via setState-in-effect.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const currentId = selectedId && orderedIds.includes(selectedId) ? selectedId : (orderedIds[0] ?? null)
  const elements = useRef(new Map<string, HTMLElement>())
  const register = (id: string, el: HTMLElement | null) => {
    if (el) elements.current.set(id, el)
    else elements.current.delete(id)
  }

  // scroll the focused edit into view (no-op under jsdom)
  useEffect(() => {
    if (currentId) elements.current.get(currentId)?.scrollIntoView?.({ block: 'center' })
  }, [currentId])

  const n = orderedIds.length
  const idx = currentId ? orderedIds.indexOf(currentId) : -1
  const go = (delta: number) => setSelectedId(orderedIds[Math.min(n - 1, Math.max(0, idx + delta))] ?? null)

  // safety net: flag any edit whose `find` still matches >1 place (e.g. doc changed post-propose)
  const ambiguous = new Map<string, number>()
  for (const c of changes) {
    const count = countOccurrences(text, (c.payload as DocEditPayload).find)
    if (count > 1) ambiguous.set(c.id, count)
  }

  return (
    <NavContext.Provider value={{ currentId, register, ambiguous }}>
      <div aria-label="diff-review" className="review">
        <div className="review__head">
          <span>{changes.length} proposed change{changes.length === 1 ? '' : 's'}</span>
          <span className="review__nav">
            <button className="btn btn--icon" aria-label="Previous change" onClick={() => go(-1)} disabled={n <= 1 || idx <= 0}>‹</button>
            <span className="review__pos">{n ? idx + 1 : 0} / {n}</span>
            <button className="btn btn--icon" aria-label="Next change" onClick={() => go(1)} disabled={n <= 1 || idx >= n - 1}>›</button>
          </span>
          <span className="review__actions">
            <button className="btn" onClick={onAcceptAll}>Accept all</button>
            <button className="btn" onClick={onRejectAll}>Reject all</button>
          </span>
        </div>
        <div className="review__body doc">
          {items.map((item, i) => {
            if (item.kind === 'static') return <MarkdownBlock key={`b${i}`} source={item.source} />
            if (item.kind === 'span') {
              const { find, replace, reason } = item.change.payload as DocEditPayload
              return (
                <div key={item.change.id} className="review-para">
                  <BreakoutChange id={item.change.id} find={find} replace={replace} reason={reason} onAccept={() => onAccept(item.change)} onReject={() => onReject(item.change)} />
                </div>
              )
            }
            return <ChangedBlock key={item.changes[0].id} before={item.before} after={item.after} changes={item.changes} onAccept={onAccept} onReject={onReject} />
          })}
          {unplaced.length > 0 && (
            <div className="review__unplaced">
              {unplaced.map((c) => {
                const { find, replace, reason } = c.payload as DocEditPayload
                return (
                  <div key={c.id} className="review__unplaced-card">
                    <div className="review__muted">This edit no longer matches the document:</div>
                    <BreakoutChange id={c.id} find={find} replace={replace} reason={reason} onAccept={() => onAccept(c)} onReject={() => onReject(c)} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </NavContext.Provider>
  )
}
