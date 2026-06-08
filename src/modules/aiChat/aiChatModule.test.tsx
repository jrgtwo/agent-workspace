import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createAiChatModule } from './aiChatModule'
import { AgentEngine } from '../../core/agentEngine'
import { Registry } from '../../core/registry'
import { PermissionBroker } from '../../core/permissionBroker'
import { AgentAccentStore } from './agentAccentStore'
import type { PermissionScope } from '../../core/types'

const accent = () => new AgentAccentStore()

// Milkdown can't run meaningfully in jsdom — stub the composer to buttons that fire onSend/onStop.
vi.mock('./composer/ChatComposer', () => ({
  ChatComposer: ({ onSend, onStop, busy }: { onSend: (s: string) => void; onStop: () => void; busy: boolean }) => (
    <div>
      <button onClick={() => onSend('help me')}>fake-send</button>
      {busy && <button onClick={onStop}>fake-stop</button>}
    </div>
  ),
}))

function fakeClient() {
  return { chat: vi.fn(async (_m: unknown, _t: unknown, onToken: (s: string) => void) => { onToken('Hi there'); return { content: 'Hi there', toolCalls: [] } }) } as never
}

const readScope: PermissionScope = { kind: 'read', resource: 'document:Untitled.md', locality: 'LOCAL', describe: () => 'Read Untitled.md?' }
const writeScope: PermissionScope = { kind: 'write', resource: 'document:Untitled.md', locality: 'LOCAL', describe: () => 'Edit Untitled.md?' }

beforeEach(() => { Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => {}) } }) })

describe('aiChatModule', () => {
  it('sends composed markdown to the engine and shows the reply', async () => {
    const broker = new PermissionBroker(() => 'p')
    const engine = new AgentEngine(fakeClient(), new Registry(), broker, 'ai-chat')
    render(createAiChatModule(engine, broker, accent()).render())
    fireEvent.click(screen.getByText('fake-send'))
    expect(await screen.findByText('help me')).toBeInTheDocument()
    expect(await screen.findByText('Hi there')).toBeInTheDocument()
  })

  it('shows an empty state before any messages', () => {
    const broker = new PermissionBroker(() => 'p')
    const engine = new AgentEngine(fakeClient(), new Registry(), broker, 'ai-chat')
    render(createAiChatModule(engine, broker, accent()).render())
    expect(screen.getByText(/no messages|ask/i)).toBeInTheDocument()
  })

  it('routes a LOCAL read to the inline surface for its own surfaceId only', async () => {
    let n = 0
    const broker = new PermissionBroker(() => `p-${++n}`)
    const engine = new AgentEngine(fakeClient(), new Registry(), broker, 'ai-chat')
    render(createAiChatModule(engine, broker, accent()).render())
    void broker.request(readScope, {}, 'ai-chat')
    void broker.request(readScope, {}, 'other')
    expect(await screen.findByTestId('perm-inline')).toBeInTheDocument()
    expect(screen.getAllByTestId('perm-inline')).toHaveLength(1)
  })

  it('routes a write to the popup surface', async () => {
    const broker = new PermissionBroker(() => 'p')
    const engine = new AgentEngine(fakeClient(), new Registry(), broker, 'ai-chat')
    render(createAiChatModule(engine, broker, accent()).render())
    void broker.request(writeScope, {}, 'ai-chat')
    expect(await screen.findByTestId('perm-popup')).toBeInTheDocument()
  })

  it('resolves an inline request when Allow is clicked', async () => {
    const broker = new PermissionBroker(() => 'p')
    const engine = new AgentEngine(fakeClient(), new Registry(), broker, 'ai-chat')
    render(createAiChatModule(engine, broker, accent()).render())
    const promise = broker.request(readScope, {}, 'ai-chat')
    await screen.findByTestId('perm-inline')
    fireEvent.click(screen.getByRole('button', { name: /allow/i }))
    await expect(promise).resolves.toBe(true)
  })
})
