import { describe, it, expect } from 'vitest'
import { McpStore } from './mcpStore'

describe('McpStore', () => {
  it('starts idle and transitions loading → ready', () => {
    const s = new McpStore()
    expect(s.getState().status).toBe('idle')
    s.setLoading()
    expect(s.getState().status).toBe('loading')
    s.setReady([{ name: 'read_file', description: 'Read' }])
    expect(s.getState()).toEqual({ status: 'ready', tools: [{ name: 'read_file', description: 'Read' }] })
  })

  it('records an error and clears the tool list', () => {
    const s = new McpStore()
    s.setReady([{ name: 'x', description: '' }])
    s.setError('bridge offline')
    expect(s.getState().status).toBe('error')
    expect(s.getState().tools).toEqual([])
    expect(s.getState().error).toBe('bridge offline')
  })

  it('notifies subscribers on change', () => {
    const s = new McpStore()
    let n = 0
    s.subscribe(() => { n++ })
    s.setLoading()
    expect(n).toBe(1)
  })
})
