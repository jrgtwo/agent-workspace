import { describe, it, expect } from 'vitest'
import { EntityStore } from './entityStore'
import type { GraphProposalPayload } from './types'

const ids = () => { let n = 0; return () => `e${++n}` }

describe('EntityStore', () => {
  it('creates entities with defaults and a generated id', () => {
    const s = new EntityStore(ids())
    const id = s.create({ type: 'task', title: 'Draft' })
    const e = s.getEntity(id)!
    expect(e.title).toBe('Draft')
    expect(e.type).toBe('task')
    expect(e.links).toEqual([])
  })

  it('links one entity to another and computes backlinks', () => {
    const s = new EntityStore(ids())
    const a = s.create({ type: 'task', title: 'A' })
    const b = s.create({ type: 'task', title: 'B' })
    s.link(a, b)
    expect(s.getEntity(a)!.links).toEqual([b])
    expect(s.backlinks(b).map((e) => e.id)).toEqual([a])
    expect(s.backlinks(a)).toEqual([])
  })

  it('does not link to a missing target, to self, or duplicate', () => {
    const s = new EntityStore(ids())
    const a = s.create({ type: 'task', title: 'A' })
    s.link(a, 'nope'); s.link(a, a); s.link(a, a)
    expect(s.getEntity(a)!.links).toEqual([])
  })

  it('removing an entity also drops inbound links to it', () => {
    const s = new EntityStore(ids())
    const a = s.create({ type: 'task', title: 'A' })
    const b = s.create({ type: 'task', title: 'B' })
    s.link(a, b)
    s.remove(b)
    expect(s.getEntity(a)!.links).toEqual([])
  })

  it('orders statuses by DEFAULT_STATUSES then alphabetical, "(none)" last', () => {
    const s = new EntityStore(ids())
    s.create({ type: 'task', title: 'A', status: 'Done' })
    s.create({ type: 'task', title: 'B', status: 'To Do' })
    s.create({ type: 'task', title: 'C', status: 'Zeta' })
    s.create({ type: 'note', title: 'D' }) // no status
    expect(s.statuses()).toEqual(['To Do', 'Done', 'Zeta', '(none)'])
  })

  it('applyProposal creates, then links by title, then updates', () => {
    const s = new EntityStore(ids())
    const payload: GraphProposalPayload = {
      create: [
        { type: 'task', title: 'Brief' },
        { type: 'task', title: 'Review', status: 'Doing' },
      ],
      link: [{ from: 'Review', to: 'Brief' }],
      update: [],
    }
    expect(s.applyProposal(payload)).toBe(true)
    const review = s.getState().entities.find((e) => e.title === 'Review')!
    const brief = s.getState().entities.find((e) => e.title === 'Brief')!
    expect(review.links).toEqual([brief.id])
  })

  it('hydrate replaces state and backfills missing links arrays', () => {
    const s = new EntityStore(ids())
    s.hydrate({ entities: [{ id: 'x', type: 'task', title: 'X', links: undefined as unknown as string[], createdAt: 1, updatedAt: 1 }] })
    expect(s.getEntity('x')!.links).toEqual([])
  })
})
