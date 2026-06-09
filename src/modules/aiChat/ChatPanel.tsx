import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { useStore } from '../../core/emitter'
import type { AgentEngine } from '../../core/agentEngine'
import type { PermissionBroker } from '../../core/permissionBroker'
import type { AgentAccentStore } from './agentAccentStore'
import { Message } from './Message'
import { ChatComposer } from './composer/ChatComposer'
import { StatusBar } from './StatusBar'
import { PermissionRequest, isHighSeverity } from './PermissionRequest'
import './aiChat.css'

export function ChatPanel({ engine, broker, accent }: { engine: AgentEngine; broker: PermissionBroker; accent: AgentAccentStore }) {
  const { messages, streaming, busy } = useStore(engine)
  const { pending } = useStore(broker)
  const { color } = useStore(accent)
  const logRef = useRef<HTMLDivElement>(null)
  const stick = useRef(true)

  // A chosen color overrides the per-theme default for every agent card (one variable).
  const accentStyle = color ? ({ '--msg-agent-accent': color } as CSSProperties) : undefined
  // Stable identity so memoized agent rows don't re-render from a new function each render.
  const onAccentChange = useCallback(
    (hex: string | null) => { if (hex === null) accent.reset(); else accent.setColor(hex) },
    [accent],
  )

  const mine = pending.filter((r) => r.surfaceId === engine.surfaceId)
  const popups = mine.filter((r) => isHighSeverity(r.scope))
  const inlines = mine.filter((r) => !isHighSeverity(r.scope))
  const visible = messages.filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))

  // Auto-scroll: stick to bottom on new content unless the user scrolled up.
  useEffect(() => {
    const el = logRef.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [visible.length, streaming, mine.length])

  const onScroll = () => {
    const el = logRef.current
    if (!el) return
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }

  const send = (markdown: string) => { stick.current = true; void engine.run(markdown) }

  // Live gauge of the prompt this chat would send — grows with the conversation, so the user can
  // watch context creep toward the model's window. Recomputed when the message list changes.
  const size = useMemo(() => engine.promptSize(), [engine, messages])
  const meter = `~${size.approxTokens.toLocaleString()} tokens`
  const meterTitle = `${size.messages} messages · ${size.tools} tools · ${size.chars.toLocaleString()} chars`

  return (
    <div className="chat" style={accentStyle}>
      <div className="chat__titlebar"><span className="chat__dot" /> agent — chat <span className="chat__tag">● local</span></div>
      <div className="chat__log" ref={logRef} onScroll={onScroll}>
        {visible.length === 0 && (
          <div className="chat__empty">No messages yet — ask for writing help below.</div>
        )}
        {visible.map((m, i) =>
          m.role === 'assistant' ? (
            <Message key={i} role="assistant" content={m.content} accent={color} onAccentChange={onAccentChange} />
          ) : (
            <Message key={i} role="user" content={m.content} />
          ),
        )}
        {busy && streaming && <Message role="assistant" content={streaming} streaming />}
        {inlines.map((req) => (
          <PermissionRequest key={req.id} req={req} onAllow={(id) => broker.allow(id)} onDeny={(id) => broker.deny(id)} />
        ))}
      </div>
      {popups.length > 0 && (
        <PermissionRequest req={popups[0]} onAllow={(id) => broker.allow(id)} onDeny={(id) => broker.deny(id)} />
      )}
      <ChatComposer busy={busy} onSend={send} onStop={() => engine.stop()} meter={meter} meterTitle={meterTitle} />
      <StatusBar busy={busy} pendingCount={mine.length} />
    </div>
  )
}
