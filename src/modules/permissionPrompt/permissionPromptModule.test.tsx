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
})
