import { describe, it, expect } from 'vitest'
import { ProposalStore } from './proposalStore'
import { ProposalApplier } from './proposalApplier'

describe('ProposalApplier', () => {
  it('accept() dispatches to the registered applier by moduleId and removes the change on success', () => {
    let n = 0
    const proposals = new ProposalStore(() => `c-${++n}`)
    const applier = new ProposalApplier(proposals)
    const applied: unknown[] = []
    applier.register('doc-editor', (c) => { applied.push(c.payload); return true })
    const id = proposals.propose({ moduleId: 'doc-editor', summary: 's', payload: { x: 1 } })
    const change = proposals.getState().pending.find((c) => c.id === id)!

    expect(applier.accept(change)).toBe(true)
    expect(applied).toEqual([{ x: 1 }])
    expect(proposals.getState().pending).toHaveLength(0)
  })

  it('accept() keeps the change when the applier returns false', () => {
    let n = 0
    const proposals = new ProposalStore(() => `c-${++n}`)
    const applier = new ProposalApplier(proposals)
    applier.register('doc-editor', () => false)
    const id = proposals.propose({ moduleId: 'doc-editor', summary: 's', payload: {} })
    const change = proposals.getState().pending.find((c) => c.id === id)!

    expect(applier.accept(change)).toBe(false)
    expect(proposals.getState().pending).toHaveLength(1)
  })

  it('accept() is a no-op returning false for an unregistered moduleId', () => {
    let n = 0
    const proposals = new ProposalStore(() => `c-${++n}`)
    const applier = new ProposalApplier(proposals)
    const id = proposals.propose({ moduleId: 'mystery', summary: 's', payload: {} })
    const change = proposals.getState().pending.find((c) => c.id === id)!
    expect(applier.accept(change)).toBe(false)
    expect(proposals.getState().pending).toHaveLength(1)
  })

  it('reject() removes the change without applying', () => {
    let n = 0
    const proposals = new ProposalStore(() => `c-${++n}`)
    const applier = new ProposalApplier(proposals)
    let applied = false
    applier.register('doc-editor', () => { applied = true; return true })
    const id = proposals.propose({ moduleId: 'doc-editor', summary: 's', payload: {} })
    const change = proposals.getState().pending.find((c) => c.id === id)!
    applier.reject(change)
    expect(applied).toBe(false)
    expect(proposals.getState().pending).toHaveLength(0)
  })
})
