import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createAiChatModule } from './aiChatModule'
import { AgentEngine } from '../../core/agentEngine'
import { Registry } from '../../core/registry'
import { PermissionBroker } from '../../core/permissionBroker'

function fakeClient() {
  return { chat: vi.fn(async (_m: any, _t: any, onToken: (s: string) => void) => { onToken('Hi there'); return { content: 'Hi there', toolCalls: [] } }) } as any
}

describe('aiChatModule', () => {
  it('sends user input to the engine and shows the assistant reply', async () => {
    const engine = new AgentEngine(fakeClient(), new Registry(), new PermissionBroker(() => 'p'))
    const mod = createAiChatModule(engine)
    render(mod.render())
    await userEvent.type(screen.getByPlaceholderText(/ask/i), 'help me')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(await screen.findByText('help me')).toBeInTheDocument()
    expect(await screen.findByText('Hi there')).toBeInTheDocument()
  })
})
