import { Emitter } from './emitter'
import type { PermissionRequest, PermissionScope } from './types'

interface BrokerState { pending: PermissionRequest[] }

export class PermissionBroker extends Emitter<BrokerState> {
  private state: BrokerState = { pending: [] }
  private genId: () => string
  constructor(genId: () => string) { super(); this.genId = genId }

  getState = (): BrokerState => this.state

  request(scope: PermissionScope, args: unknown, surfaceId?: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const req: PermissionRequest = {
        id: this.genId(),
        scope,
        detail: scope.describe(args),
        surfaceId,
        resolve,
      }
      this.state = { pending: [...this.state.pending, req] }
      this.notify()
    })
  }

  allow(id: string): void { this.settle(id, true) }
  deny(id: string): void { this.settle(id, false) }

  private settle(id: string, allowed: boolean): void {
    const req = this.state.pending.find((r) => r.id === id)
    if (!req) return
    this.state = { pending: this.state.pending.filter((r) => r.id !== id) }
    this.notify()
    req.resolve(allowed)
  }
}
