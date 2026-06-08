import { useRef } from 'react'
import { MilkdownProvider, Milkdown, useEditor } from '@milkdown/react'
import { $prose, replaceAll, getMarkdown } from '@milkdown/kit/utils'
import { keymap } from '@milkdown/kit/prose/keymap'
import type { EditorView } from '@milkdown/kit/prose/view'
import { buildMilkdownEditor } from '../../docEditor/milkdown/editorConfig'
import { shouldSend } from './shouldSend'

interface Props {
  busy: boolean
  onSend: (markdown: string) => void
  onStop: () => void
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

function ComposerInner({ busy, onSend, onStop }: Props) {
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
      <div className="chat-composer__field">
        <Milkdown />
      </div>
      <ComposerButtons busy={busy} onSend={onSendClick} onStop={onStop} />
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
