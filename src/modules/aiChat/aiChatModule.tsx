import { useState } from 'react'
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { AgentEngine } from '../../core/agentEngine'

function ChatPanel({ engine }: { engine: AgentEngine }) {
  const { messages, streaming, busy } = useStore(engine)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

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
        {error && <div style={{ color: '#b00', fontSize: 11 }}>{error}</div>}
      </div>
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

export function createAiChatModule(engine: AgentEngine): WorkspaceModule {
  return {
    id: 'ai-chat',
    title: 'AI Chat — writing ideas',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 55, collapsible: true, minSize: 20 },
    render: () => <ChatPanel engine={engine} />,
    tools: [],
  }
}
