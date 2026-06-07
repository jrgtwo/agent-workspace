import { useState } from 'react'
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { AgentEngine } from '../../core/agentEngine'
import type { PermissionBroker } from '../../core/permissionBroker'
import './aiChat.css'

function ChatPanel({ engine, broker }: { engine: AgentEngine; broker: PermissionBroker }) {
  const { messages, streaming, busy } = useStore(engine)
  const { pending } = useStore(broker)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mine = pending.filter((r) => r.surfaceId === engine.surfaceId)

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    setInput(''); setError(null)
    try { await engine.run(text) } catch (e) { setError((e as Error).message) }
  }

  const visible = messages.filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))

  return (
    <div className="chat">
      <div className="chat__log">
        {visible.map((m, i) => (
          <div key={i} className={`chat__msg chat__msg--${m.role === 'user' ? 'user' : 'assistant'}`}>
            {m.content}
          </div>
        ))}
        {busy && streaming && (
          <div className="chat__msg chat__msg--assistant chat__msg--streaming">{streaming}</div>
        )}
        {mine.map((req) => (
          <div key={req.id} className="chat__perm">
            <div className="chat__perm-head"><strong>{req.scope.locality}</strong> · <span>{req.detail}</span></div>
            <div className="chat__row">
              <button className="btn btn--accent" onClick={() => broker.allow(req.id)}>Allow</button>
              <button className="btn" onClick={() => broker.deny(req.id)}>Deny</button>
            </div>
          </div>
        ))}
        {error && <div className="chat__error">{error}</div>}
      </div>
      {mine.length > 0 && (
        <div className="chat__waiting">
          {mine.length} permission{mine.length > 1 ? 's' : ''} waiting
        </div>
      )}
      <div className="chat__input-row">
        <input
          className="chat__input"
          placeholder="Ask for writing help…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
        />
        <button className="btn btn--accent" onClick={send} disabled={busy}>Send</button>
      </div>
    </div>
  )
}

export function createAiChatModule(engine: AgentEngine, broker: PermissionBroker): WorkspaceModule {
  return {
    id: 'ai-chat',
    title: 'AI Chat — writing ideas',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 55, collapsible: true, minSize: 20 },
    render: () => <ChatPanel engine={engine} broker={broker} />,
    tools: [],
  }
}
