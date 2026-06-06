import { describe, it, expect, vi } from 'vitest'
import { Emitter } from './emitter'

class Counter extends Emitter<{ n: number }> {
  state = { n: 0 }
  getState = () => this.state
  inc() { this.state = { n: this.state.n + 1 }; this.notify() }
}

describe('Emitter', () => {
  it('notifies subscribers and returns a stable snapshot until mutation', () => {
    const c = new Counter()
    const listener = vi.fn()
    const unsub = c.subscribe(listener)
    const before = c.getState()
    c.inc()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(c.getState()).not.toBe(before)
    expect(c.getState().n).toBe(1)
    unsub()
    c.inc()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
