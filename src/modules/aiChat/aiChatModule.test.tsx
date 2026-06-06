import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createAiChatModule } from './aiChatModule'
import { AgentEngine } from '../../core/agentEngine'
import { Registry } from '../../core/registry'
import { PermissionBroker } from '../../core/permissionBroker'
import type { PermissionScope } from '../../core/types'

function fakeClient() {
  return { chat: vi.fn(async (_m: any, _t: any, onToken: (s: string) => void) => { onToken('Hi there'); return { content: 'Hi there', toolCalls: [] } }) } as any
}

const readScope: PermissionScope = { kind: 'read', resource: 'document:Untitled.md', locality: 'LOCAL', describe: () => 'Read Untitled.md?' }
const webScope: PermissionScope = { kind: 'read', resource: 'web', locality: 'NETWORK', describe: () => 'Search the web?' }

describe('aiChatModule', () => {
  it('sends user input to the engine and shows the assistant reply', async () => {
    const broker = new PermissionBroker(() => 'p')
    const engine = new AgentEngine(fakeClient(), new Registry(), broker)
    const mod = createAiChatModule(engine, broker)
    render(mod.render())
    await userEvent.type(screen.getByPlaceholderText(/ask/i), 'help me')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(await screen.findByText('help me')).toBeInTheDocument()
    expect(await screen.findByText('Hi there')).toBeInTheDocument()
  })

  it('renders only permission requests for its own surface, with a waiting badge', async () => {
    let n = 0
    const broker = new PermissionBroker(() => `p-${++n}`)
    const engine = new AgentEngine(fakeClient(), new Registry(), broker, 'ai-chat')
    render(createAiChatModule(engine, broker).render())

    void broker.request(readScope, {}, 'ai-chat')
    void broker.request(webScope, {}, 'search')

    expect(await screen.findByText('Read Untitled.md?')).toBeInTheDocument()
    expect(screen.queryByText('Search the web?')).not.toBeInTheDocument()
    expect(screen.getByText(/1 permission waiting/i)).toBeInTheDocument()
  })

  it('resolves its inline request when Allow is clicked', async () => {
    let n = 0
    const broker = new PermissionBroker(() => `p-${++n}`)
    const engine = new AgentEngine(fakeClient(), new Registry(), broker, 'ai-chat')
    render(createAiChatModule(engine, broker).render())

    const promise = broker.request(readScope, {}, 'ai-chat')
    await screen.findByText('Read Untitled.md?')
    await userEvent.click(screen.getByRole('button', { name: /allow/i }))
    await expect(promise).resolves.toBe(true)
  })
})
