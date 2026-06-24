import { describe, it, expect } from 'vitest'
import { buildToolIndex } from './toolIndex.mjs'

describe('buildToolIndex', () => {
  it('flattens and tags tools with their connector id', () => {
    const { tools, index } = buildToolIndex([
      { connectorId: 'filesystem', tools: [{ name: 'read_file', description: 'Read', inputSchema: { type: 'object' } }] },
      { connectorId: 'pandoc', tools: [{ name: 'convert-contents', description: 'Convert', inputSchema: { type: 'object' } }] },
    ])
    expect(tools).toHaveLength(2)
    expect(tools.find((t) => t.name === 'convert-contents').connector).toBe('pandoc')
    expect(index.get('read_file')).toBe('filesystem')
    expect(index.get('convert-contents')).toBe('pandoc')
  })

  it('keeps the first on a name collision and records it', () => {
    const { tools, index, collisions } = buildToolIndex([
      { connectorId: 'filesystem', tools: [{ name: 'read_file', description: 'A', inputSchema: {} }] },
      { connectorId: 'other', tools: [{ name: 'read_file', description: 'B', inputSchema: {} }] },
    ])
    expect(tools).toHaveLength(1)
    expect(index.get('read_file')).toBe('filesystem')
    expect(collisions).toEqual(['read_file'])
  })
})
