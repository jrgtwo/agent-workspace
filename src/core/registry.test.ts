import { describe, it, expect } from 'vitest'
import { Registry } from './registry'
import type { ToolDef } from './types'

const tool: ToolDef = {
  name: 'read_document', description: 'read', parameters: { type: 'object', properties: {} },
  handler: () => 'doc text',
}

describe('Registry', () => {
  it('registers and looks up tools by name', () => {
    const r = new Registry()
    r.register([tool])
    expect(r.get('read_document')).toBe(tool)
    expect(r.all()).toHaveLength(1)
    expect(r.get('missing')).toBeUndefined()
  })
})
