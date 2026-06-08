import { memo } from 'react'
import { Markdown } from './markdown/Markdown'
import { AgentAccentPicker } from './AgentAccentPicker'

interface Props {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  /** Current agent accent override (assistant rows only). */
  accent?: string | null
  /** When provided on an assistant row, the agent label becomes a color picker. */
  onAccentChange?: (hex: string | null) => void
}

// Memoized so re-renders driven by unrelated state (e.g. accent color drag) skip rows whose
// props are unchanged — only the assistant rows that receive the changing `accent` re-render.
export const Message = memo(function Message({ role, content, streaming, accent, onAccentChange }: Props) {
  const isUser = role === 'user'
  const copy = () => { void navigator.clipboard.writeText(content) }
  return (
    <div className={`chat-msg chat-msg--${role}`}>
      <div className="chat-msg__card">
        {!isUser && onAccentChange ? (
          <AgentAccentPicker color={accent ?? null} onChange={onAccentChange} />
        ) : (
          <span className="chat-msg__label">
            <span className="chat-msg__sig">{isUser ? '›' : '▌'}</span>
            {isUser ? 'you' : 'agent'}
          </span>
        )}
        <button type="button" className="chat-msg__copy" onClick={copy}>copy</button>
        <div className="chat-msg__body">
          <Markdown>{content}</Markdown>
          {streaming && <span className="chat-msg__cursor" aria-hidden="true" />}
        </div>
      </div>
    </div>
  )
})
