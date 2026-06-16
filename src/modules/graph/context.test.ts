import { describe, it, expect } from 'vitest'
import { EntityStore } from './entityStore'
import { describeGraphContext } from './context'

const ids = () => { let n = 0; return () => `e${++n}` }

describe('describeGraphContext', () => {
  it('reports an empty graph', () => {
    const s = new EntityStore(ids())
    expect(describeGraphContext(s)).toMatch(/EMPTY/)
  })

  it('summarizes count, types, and groups by status', () => {
    const s = new EntityStore(ids())
    s.create({ type: 'task', title: 'Brief', status: 'To Do' })
    s.create({ type: 'note', title: 'Ideas' })
    const out = describeGraphContext(s)
    expect(out).toMatch(/2 entities/)
    expect(out).toContain('task')
    expect(out).toContain('note')
    expect(out).toContain('"Brief"')
    expect(out).toContain('"Ideas"')
  })
})
