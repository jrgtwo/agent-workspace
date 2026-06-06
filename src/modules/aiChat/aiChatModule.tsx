import { useState } from 'react'
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { AgentEngine } from '../../core/agentEngine'
import type { PermissionBroker } from '../../core/permissionBroker'

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? '#5b6cff' : '#f0f1f6', color: m.role === 'user' ? '#fff' : '#222', borderRadius: 8, padding: '6px 9px', fontSize: 12, maxWidth: '85%' }}>
            {m.content}
          </div>
        ))}
        {busy && streaming && (
          <div style={{ alignSelf: 'flex-start', background: '#f0f1f6', borderRadius: 8, padding: '6px 9px', fontSize: 12, opacity: 0.8 }}>{streaming}</div>
        )}
        {mine.map((req) => (
          <div key={req.id} style={{ alignSelf: 'stretch', background: '#fff7e6', border: '1px solid #ffe2a8', borderRadius: 8, padding: 8, fontSize: 12 }}>
            <div style={{ marginBottom: 6 }}><strong>{req.scope.locality}</strong> · <span>{req.detail}</span></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => broker.allow(req.id)}>Allow</button>
              <button onClick={() => broker.deny(req.id)}>Deny</button>
            </div>
          </div>
        ))}
        {error && <div style={{ color: '#b00', fontSize: 11 }}>{error}</div>}
      </div>
      {mine.length > 0 && (
        <div style={{ padding: '4px 8px', fontSize: 11, color: '#8a6d1f', background: '#fffaf0', borderTop: '1px solid #ffe2a8' }}>
          {mine.length} permission{mine.length > 1 ? 's' : ''} waiting
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, padding: 8, borderTop: '1px solid #eee' }}>
        <input
          style={{ flex: 1 }}
          placeholder="Ask for writing help…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
        />
        <button onClick={send} disabled={busy}>Send</button>
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
