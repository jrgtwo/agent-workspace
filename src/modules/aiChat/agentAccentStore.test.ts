import { describe, it, expect, vi } from 'vitest'
import { AgentAccentStore, isHexColor } from './agentAccentStore'

describe('isHexColor', () => {
  it('accepts 6-digit hex, rejects everything else', () => {
    expect(isHexColor('#aabbcc')).toBe(true)
    expect(isHexColor('#AABBCC')).toBe(true)
    expect(isHexColor('#abc')).toBe(false)
    expect(isHexColor('red')).toBe(false)
    expect(isHexColor(123)).toBe(false)
  })
})

describe('AgentAccentStore', () => {
  it('defaults to null (use the theme default)', () => {
    expect(new AgentAccentStore().getState().color).toBeNull()
  })

  it('setColor stores a valid hex and notifies once', () => {
    const s = new AgentAccentStore()
    const spy = vi.fn()
    s.subscribe(spy)
    s.setColor('#d98f4e')
    expect(s.getState().color).toBe('#d98f4e')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('setColor ignores invalid hex and no-op repeats', () => {
    const s = new AgentAccentStore()
    s.setColor('not-a-color' as unknown as string)
    expect(s.getState().color).toBeNull()
    s.setColor('#112233')
    const spy = vi.fn()
    s.subscribe(spy)
    s.setColor('#112233') // same value → no notify
    expect(spy).not.toHaveBeenCalled()
  })

  it('reset returns to null', () => {
    const s = new AgentAccentStore()
    s.setColor('#ffffff')
    s.reset()
    expect(s.getState().color).toBeNull()
  })

  it('hydrate restores a valid color and rejects junk', () => {
    const s = new AgentAccentStore()
    s.hydrate({ color: '#112233' })
    expect(s.getState().color).toBe('#112233')
    const s2 = new AgentAccentStore()
    s2.hydrate({ color: 'nope' } as unknown as { color: string | null })
    expect(s2.getState().color).toBeNull()
  })
})
