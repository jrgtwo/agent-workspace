import { useEffect, useRef } from 'react'
import { MilkdownProvider, Milkdown, useEditor } from '@milkdown/react'
import { $prose, replaceAll, getMarkdown } from '@milkdown/kit/utils'
import { keymap } from '@milkdown/kit/prose/keymap'
import { editorViewCtx } from '@milkdown/kit/core'
import type { EditorView } from '@milkdown/kit/prose/view'
import { useStore } from '../../../core/emitter'
import type { ComposerDraftStore } from './composerDraftStore'
import { buildMilkdownEditor } from '../../docEditor/milkdown/editorConfig'
import { shouldSend } from './shouldSend'

interface Props {
  busy: boolean
  onSend: (markdown: string) => void
  onStop: () => void
  /** Optional live context-size label (e.g. "~2,108 tokens") shown under the input. */
  meter?: string
  /** Tooltip detail for the meter (e.g. "14 messages · 8,432 chars"). */
  meterTitle?: string
  /** Optional channel that prefills the composer (e.g. Connectors example prompts). */
  draft?: ComposerDraftStore
}

export function ComposerButtons({
  busy,
  onSend,
  onStop,
}: {
  busy: boolean
  onSend: () => void
  onStop: () => void
}) {
  return busy ? (
    <button
      type="button"
      className="chat-composer__btn chat-composer__btn--stop"
      onClick={onStop}
      aria-label="Stop"
    >
      ■
    </button>
  ) : (
    <button
      type="button"
      className="chat-composer__btn chat-composer__btn--send"
      onClick={onSend}
      aria-label="Send"
    >
      ↑
    </button>
  )
}

// Stable fallback so the draft hook order stays constant when no draft store is provided.
// getState must return a stable reference — useSyncExternalStore loops if the snapshot changes identity.
const EMPTY_DRAFT_STATE = { text: '', seq: 0 }
const NOOP_DRAFT = { subscribe: () => () => {}, getState: () => EMPTY_DRAFT_STATE }

function ComposerInner({ busy, onSend, onStop, meter, meterTitle, draft }: Props) {
  const mdRef = useRef('')
  const busyRef = useRef(busy)
  busyRef.current = busy
  const onSendRef = useRef(onSend)
  onSendRef.current = onSend

  const { get } = useEditor((root) => {
    const editor = buildMilkdownEditor({
      root,
      defaultValue: '',
      onChange: (md) => {
        mdRef.current = md
      },
    })
    // Enter sends; Shift-Enter falls through (Milkdown inserts a newline); Mod-Enter also sends.
    const trySend = (view?: EditorView): boolean => {
      if (!shouldSend(mdRef.current, busyRef.current)) return false
      onSendRef.current(mdRef.current.trim())
      if (view) view.dispatch(view.state.tr.delete(0, view.state.doc.content.size))
      mdRef.current = ''
      return true
    }
    editor.use(
      $prose(() =>
        keymap({
          Enter: (_state, _dispatch, view) => trySend(view),
          'Mod-Enter': (_state, _dispatch, view) => trySend(view),
        }),
      ),
    )
    return editor
  }, [])

  // Prefill from the draft channel (e.g. a clicked example prompt): load the text into the
  // editor without sending, so the user can edit and press Send. seq bumps even for repeats.
  const { text: draftText, seq: draftSeq } = useStore(draft ?? NOOP_DRAFT)
  const appliedSeq = useRef(0)
  useEffect(() => {
    if (draftSeq === 0 || draftSeq === appliedSeq.current) return
    appliedSeq.current = draftSeq
    const editor = get()
    if (!editor) return
    editor.action(replaceAll(draftText))
    mdRef.current = draftText
    editor.action((ctx) => { ctx.get(editorViewCtx).focus() })
  }, [draftSeq, draftText, get])

  // Button send path: read current markdown, send, then clear via replaceAll.
  const onSendClick = () => {
    const editor = get()
    const md = editor ? (editor.action(getMarkdown()) as string) : mdRef.current
    if (!shouldSend(md, busyRef.current)) return
    onSendRef.current(md.trim())
    if (editor) editor.action(replaceAll(''))
    mdRef.current = ''
  }

  return (
    <div className="chat-composer">
      <div className="chat-composer__row">
        <div className="chat-composer__field">
          <Milkdown />
        </div>
        <ComposerButtons busy={busy} onSend={onSendClick} onStop={onStop} />
      </div>
      {meter && (
        <div className="chat-composer__meter" title={meterTitle}>
          {meter}
        </div>
      )}
    </div>
  )
}

export function ChatComposer(props: Props) {
  return (
    <MilkdownProvider>
      <ComposerInner {...props} />
    </MilkdownProvider>
  )
}

