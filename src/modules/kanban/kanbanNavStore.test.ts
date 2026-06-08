import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KanbanNavStore } from './kanbanNavStore'

describe('KanbanNavStore', () => {
  let nav: KanbanNavStore
  beforeEach(() => {
    nav = new KanbanNavStore()
  })

  it('starts on the projects view with no active scope', () => {
    expect(nav.getState().view).toEqual({ kind: 'projects' })
    expect(nav.activeScope()).toBeNull()
  })

  it('openBoard switches to a board view and exposes the active scope', () => {
    nav.openBoard({ projectId: 'p1' })
    expect(nav.getState().view).toEqual({ kind: 'board', scope: { projectId: 'p1' } })
    expect(nav.activeScope()).toEqual({ projectId: 'p1' })
  })

  it('treats a sub-board as a board view with a parentCardId', () => {
    nav.openBoard({ projectId: 'p1', parentCardId: 'c9' })
    expect(nav.activeScope()).toEqual({ projectId: 'p1', parentCardId: 'c9' })
  })

  it('openProjects resets to the projects view and notifies subscribers', () => {
    const listener = vi.fn()
    nav.subscribe(listener)
    nav.openBoard({ projectId: 'p1' })
    nav.openProjects()
    expect(nav.getState().view).toEqual({ kind: 'projects' })
    expect(nav.activeScope()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
