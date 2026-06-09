import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createSessionsModule } from './sessionsModule'
import { OrchestratorSessionStore } from './sessionStore'
import { createStorage } from '../../core/storage/storage'
import { MemoryBackend } from '../../core/storage/memoryBackend'

async function setup() {
  let n = 0
  const store = new OrchestratorSessionStore(createStorage(new MemoryBackend()).scope('s'), () => `s-${++n}`, () => 1)
  await store.init()
  return store
}

describe('sessionsModule', () => {
  it('lists sessions and highlights the active one', async () => {
    const store = await setup()
    await store.create('Work project')
    render(createSessionsModule(store).render())
    expect(screen.getByText('Work project')).toBeInTheDocument()
  })

  it('creating a new conversation adds a session', async () => {
    const store = await setup()
    render(createSessionsModule(store).render())
    fireEvent.click(screen.getByRole('button', { name: /create conversation/i }))
    expect(store.getState().sessions.length).toBe(2)
  })
})
