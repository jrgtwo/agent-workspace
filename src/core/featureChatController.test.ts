import { describe, it, expect, vi } from 'vitest'
import { createFeatureChatController, type ControllableEngine } from './featureChatController'
import { createStorage } from './storage/storage'
import { MemoryBackend } from './storage/memoryBackend'
import type { ChatMessage } from './types'

// Minimal fake engine implementing only what the controller uses.
class FakeEngine implements ControllableEngine {
  messages: ChatMessage[] = []
  busy = false
  system = ''
  stopped = 0
  private subs = new Set<() => void>()
  subscribe(cb: () => void) { this.subs.add(cb); return () => { this.subs.delete(cb) } }
  getState() { return { messages: this.messages, busy: this.busy } }
  hydrateMessages(m: ChatMessage[]) { this.messages = m; this.emit() }
  seedSystem(p: string) { this.system = p }
  stop() { this.stopped++ }
  push(m: ChatMessage) { this.messages = [...this.messages, m]; this.emit() }
  private emit() { for (const cb of this.subs) cb() }
}

class FakeSource {
  private subs = new Set<() => void>()
  subscribe(cb: () => void) { this.subs.add(cb); return () => { this.subs.delete(cb) } }
  change() { for (const cb of this.subs) cb() }
}

function makeScope() { return createStorage(new MemoryBackend()).scope('chat-test') }

describe('FeatureChatController', () => {
  it('loads the saved thread for the initial key and seeds the system prompt', async () => {
    const scope = makeScope()
    await scope.set('A', [{ role: 'user', content: 'hi from A' }])
    const engine = new FakeEngine()
    const key = 'A'
    await createFeatureChatController({
      engine, scope, systemPrompt: 'SYS', getKey: () => key, source: new FakeSource(),
    })
    expect(engine.messages).toEqual([{ role: 'user', content: 'hi from A' }])
    expect(engine.system).toBe('SYS')
  })

  it('flush-saves the outgoing thread and loads the incoming one on context change', async () => {
    const scope = makeScope()
    const engine = new FakeEngine()
    const source = new FakeSource()
    let key = 'A'
    await createFeatureChatController({
      engine, scope, systemPrompt: 'SYS', getKey: () => key, source,
    })
    engine.push({ role: 'user', content: 'message in A' })

    key = 'B'
    source.change()
    await vi.waitFor(async () => {
      expect((await scope.get<ChatMessage[]>('A'))).toEqual([{ role: 'user', content: 'message in A' }])
    })
    expect(engine.messages).toEqual([]) // B has no saved thread

    // switching back restores A
    key = 'A'
    source.change()
    await vi.waitFor(() => expect(engine.messages).toEqual([{ role: 'user', content: 'message in A' }]))
  })

  it('aborts an in-flight run before swapping when the engine is busy', async () => {
    const engine = new FakeEngine()
    const source = new FakeSource()
    let key = 'A'
    await createFeatureChatController({
      engine, scope: makeScope(), systemPrompt: 'SYS', getKey: () => key, source,
    })
    engine.busy = true
    key = 'B'
    source.change()
    expect(engine.stopped).toBe(1)
  })

  it('prunes threads whose key is not in listValidKeys', async () => {
    const scope = makeScope()
    await scope.set('A', [{ role: 'user', content: 'a' }])
    await scope.set('GONE', [{ role: 'user', content: 'orphan' }])
    const engine = new FakeEngine()
    const source = new FakeSource()
    let validKeys = ['A', 'GONE']
    const key = 'A'
    await createFeatureChatController({
      engine, scope, systemPrompt: 'SYS', getKey: () => key, source, listValidKeys: () => validKeys,
    })
    validKeys = ['A'] // GONE was deleted
    source.change()
    await vi.waitFor(async () => {
      expect(await scope.get('GONE')).toBeUndefined()
      expect(await scope.get('A')).toEqual([{ role: 'user', content: 'a' }])
    })
  })

  it('never prunes the active thread even when it is absent from listValidKeys', async () => {
    const scope = makeScope()
    await scope.set('A', [{ role: 'user', content: 'a' }])
    const engine = new FakeEngine()
    const source = new FakeSource()
    const key = 'A'
    await createFeatureChatController({
      engine, scope, systemPrompt: 'SYS', getKey: () => key, source, listValidKeys: () => [],
    })
    source.change()
    await new Promise((r) => setTimeout(r, 0))
    expect(await scope.get('A')).toEqual([{ role: 'user', content: 'a' }])
  })
})
