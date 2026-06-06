import { describe, it, expect } from 'vitest'
import { MemoryBackend } from './memoryBackend'

describe('MemoryBackend', () => {
  it('round-trips values and lists keys within a namespace', async () => {
    const b = new MemoryBackend()
    await b.set('docs', 'a', { text: 'hi' })
    await b.set('docs', 'b', 42)
    expect(await b.get('docs', 'a')).toEqual({ text: 'hi' })
    expect((await b.keys('docs')).sort()).toEqual(['a', 'b'])
    await b.delete('docs', 'a')
    expect(await b.get('docs', 'a')).toBeUndefined()
  })

  it('isolates namespaces (same key in different namespaces do not collide)', async () => {
    const b = new MemoryBackend()
    await b.set('docs', 'k', 'D')
    await b.set('images', 'k', 'I')
    expect(await b.get('docs', 'k')).toBe('D')
    expect(await b.get('images', 'k')).toBe('I')
    expect(await b.keys('docs')).toEqual(['k'])
  })
})
