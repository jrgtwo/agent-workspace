import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createPermissionPromptModule } from './permissionPromptModule'
import { PermissionBroker } from '../../core/permissionBroker'

const scope = { kind: 'read' as const, resource: 'document:Untitled.md', locality: 'LOCAL' as const, describe: () => 'Read Untitled.md?' }

describe('permissionPromptModule', () => {
  it('renders pending requests and resolves them via Allow', async () => {
    let n = 0
    const broker = new PermissionBroker(() => `p-${++n}`)
    const mod = createPermissionPromptModule(broker)
    render(mod.render())
    const promise = broker.request(scope, {})
    expect(await screen.findByText('Read Untitled.md?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /allow/i }))
    await expect(promise).resolves.toBe(true)
  })

  it('shows pending requests from multiple surfaces, each with a surface label', async () => {
    let n = 0
    const broker = new PermissionBroker(() => `p-${++n}`)
    const mod = createPermissionPromptModule(broker)
    render(mod.render())

    void broker.request(scope, {}, 'ai-chat')
    void broker.request({ ...scope, describe: () => 'Search the web?' }, {}, 'search')

    expect(await screen.findByText('Read Untitled.md?')).toBeInTheDocument()
    expect(await screen.findByText('Search the web?')).toBeInTheDocument()
    expect(screen.getByText('[ai-chat]')).toBeInTheDocument()
    expect(screen.getByText('[search]')).toBeInTheDocument()
  })
})
