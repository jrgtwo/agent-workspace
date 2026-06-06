import { describe, it, expect } from 'vitest'
import { PermissionBroker } from './permissionBroker'
import type { PermissionScope } from './types'

const readScope: PermissionScope = {
  kind: 'read',
  resource: 'document:Untitled.md',
  locality: 'LOCAL',
  describe: () => 'Read Untitled.md?',
}

describe('PermissionBroker', () => {
  it('enqueues a request and resolves true when allowed', async () => {
    const broker = new PermissionBroker(() => 'id-1')
    const promise = broker.request(readScope, {})
    expect(broker.getState().pending).toHaveLength(1)
    expect(broker.getState().pending[0].detail).toBe('Read Untitled.md?')
    broker.allow('id-1')
    await expect(promise).resolves.toBe(true)
    expect(broker.getState().pending).toHaveLength(0)
  })

  it('resolves false when denied (default-deny semantics)', async () => {
    const broker = new PermissionBroker(() => 'id-2')
    const promise = broker.request(readScope, {})
    broker.deny('id-2')
    await expect(promise).resolves.toBe(false)
    expect(broker.getState().pending).toHaveLength(0)
  })
})
