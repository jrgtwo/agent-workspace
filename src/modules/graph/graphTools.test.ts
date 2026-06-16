import { describe, it, expect } from 'vitest'
import { EntityStore } from './entityStore'
import { ProposalStore } from '../../core/proposalStore'
import { ProposalApplier } from '../../core/proposalApplier'
import { createGraphTools } from './graphTools'
import type { GraphProposalPayload } from './types'

const ids = () => { let n = 0; return () => `e${++n}` }

function setup() {
  const store = new EntityStore(ids())
  const proposals = new ProposalStore(() => `p${Math.random()}`)
  const applier = new ProposalApplier(proposals)
  applier.register('graph', (c) => store.applyProposal(c.payload as GraphProposalPayload))
  const tools = createGraphTools({ store, proposals })
  const get = (name: string) => tools.find((t) => t.name === name)!
  return { store, proposals, applier, get }
}

describe('graph tools', () => {
  it('create_entities enqueues ONE proposal for the whole batch', async () => {
    const { proposals, get } = setup()
    await get('create_entities').handler({ entities: [{ type: 'task', title: 'A' }, { type: 'note', title: 'B' }] })
    expect(proposals.getState().pending).toHaveLength(1)
    expect((proposals.getState().pending[0].payload as GraphProposalPayload).create).toHaveLength(2)
    expect(proposals.getState().pending[0].moduleId).toBe('graph')
  })

  it('accepting a create proposal applies it to the store', async () => {
    const { store, proposals, applier, get } = setup()
    await get('create_entities').handler({ entities: [{ type: 'task', title: 'A' }] })
    applier.accept(proposals.getState().pending[0])
    expect(store.getState().entities.map((e) => e.title)).toEqual(['A'])
  })

  it('create_entities rejects an empty list', async () => {
    const { get } = setup()
    const r = await get('create_entities').handler({ entities: [] }) as { ok: boolean }
    expect(r.ok).toBe(false)
  })

  it('link_entities skips pairs whose entities do not exist', async () => {
    const { store, proposals, get } = setup()
    store.create({ type: 'task', title: 'A' })
    const r = await get('link_entities').handler({ links: [{ from: 'A', to: 'ghost' }] }) as { ok: boolean }
    expect(r.ok).toBe(false)
    expect(proposals.getState().pending).toHaveLength(0)
  })

  it('update_entity resolves by title and proposes a patch', async () => {
    const { store, proposals, applier, get } = setup()
    const id = store.create({ type: 'task', title: 'A', status: 'To Do' })
    await get('update_entity').handler({ entity: 'A', status: 'Done' })
    applier.accept(proposals.getState().pending[0])
    expect(store.getEntity(id)!.status).toBe('Done')
  })
})
