import { describe, it, expect } from 'vitest'
import { ResearchRegistry } from './researchRegistry'
import type { ResearchProvider } from './types'

const fake = (id: string): ResearchProvider => ({ id, label: id, search: async () => [] })

describe('ResearchRegistry', () => {
  it('registers, gets, and lists providers', () => {
    const reg = new ResearchRegistry()
    reg.register(fake('searxng'))
    expect(reg.get('searxng')?.id).toBe('searxng')
    expect(reg.get('nope')).toBeUndefined()
    expect(reg.list().map((p) => p.id)).toEqual(['searxng'])
  })
})
