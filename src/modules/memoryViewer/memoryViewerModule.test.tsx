import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryViewerModule } from './memoryViewerModule'
import { MemoryStore } from '../../core/memoryStore'

let c = 0
const genId = () => `m-${++c}`

describe('memoryViewerModule', () => {
  beforeEach(() => { localStorage.clear(); c = 0 })

  it('exposes a remember tool that writes to the store (LOCAL, no permission gate)', async () => {
    const store = new MemoryStore('mem', genId, () => 1)
    const mod = createMemoryViewerModule(store)
    const remember = mod.tools.find((t) => t.name === 'remember')!
    expect(remember.permission).toBeUndefined()
    await remember.handler({ fact: 'User prefers concise intros' })
    expect(store.getState().entries[0].text).toBe('User prefers concise intros')
  })

  it('renders saved memories', () => {
    const store = new MemoryStore('mem', genId, () => 1)
    store.add('User prefers concise intros')
    const mod = createMemoryViewerModule(store)
    render(mod.render())
    expect(screen.getByText('User prefers concise intros')).toBeInTheDocument()
  })
})
