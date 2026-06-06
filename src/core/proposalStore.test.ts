import { describe, it, expect } from 'vitest'
import { ProposalStore } from './proposalStore'

describe('ProposalStore', () => {
  it('propose() enqueues a change with a generated id and returns the id', () => {
    let n = 0
    const store = new ProposalStore(() => `c-${++n}`)
    const id = store.propose({ moduleId: 'doc-editor', summary: 'edit', payload: { find: 'a', replace: 'b' } })
    expect(id).toBe('c-1')
    expect(store.getState().pending).toHaveLength(1)
    expect(store.getState().pending[0]).toMatchObject({ id: 'c-1', moduleId: 'doc-editor', payload: { find: 'a', replace: 'b' } })
  })

  it('remove() dequeues by id', () => {
    let n = 0
    const store = new ProposalStore(() => `c-${++n}`)
    const id = store.propose({ moduleId: 'doc-editor', summary: 's', payload: {} })
    store.remove(id)
    expect(store.getState().pending).toHaveLength(0)
  })

  it('forModule() returns only changes for that module', () => {
    let n = 0
    const store = new ProposalStore(() => `c-${++n}`)
    store.propose({ moduleId: 'doc-editor', summary: 's', payload: {} })
    store.propose({ moduleId: 'map', summary: 's', payload: {} })
    expect(store.forModule('doc-editor')).toHaveLength(1)
    expect(store.forModule('doc-editor')[0].moduleId).toBe('doc-editor')
  })

  it('notifies subscribers on propose and remove', () => {
    let n = 0
    const store = new ProposalStore(() => `c-${++n}`)
    let count = 0
    store.subscribe(() => { count++ })
    const id = store.propose({ moduleId: 'doc-editor', summary: 's', payload: {} })
    store.remove(id)
    expect(count).toBe(2)
  })
})
