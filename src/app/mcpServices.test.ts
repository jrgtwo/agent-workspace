import { describe, it, expect, vi } from 'vitest'
import { createServices } from './services'
import { MemoryBackend } from '../core/storage/memoryBackend'

const fakeClient = { chat: vi.fn() }

describe('MCP wiring in services', () => {
  it('boots with connector tools when the bridge responds', async () => {
    const mcpClient = {
      listTools: vi.fn().mockResolvedValue([{ name: 'read_file', description: 'Read', inputSchema: { type: 'object' } }]),
      call: vi.fn(),
    }
    const services = await createServices({ client: fakeClient, backend: new MemoryBackend(), mcpClient })
    expect(services.mcp.getState().status).toBe('ready')
    expect(services.features.some((f) => f.id === 'connectors')).toBe(true)
  })

  it('still boots when the bridge is unreachable (resilient)', async () => {
    const mcpClient = { listTools: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')), call: vi.fn() }
    const services = await createServices({ client: fakeClient, backend: new MemoryBackend(), mcpClient })
    expect(services.mcp.getState().status).toBe('error')
    expect(services.features.some((f) => f.id === 'connectors')).toBe(true)
  })

  it('groups tools by connector and assigns per-connector locality', async () => {
    const mcpClient = {
      listTools: vi.fn().mockResolvedValue([
        { name: 'read_file', description: 'Read', inputSchema: { type: 'object' }, connector: 'filesystem' },
        { name: 'convert-contents', description: 'Convert', inputSchema: { type: 'object' }, connector: 'pandoc' },
        { name: 'mystery', description: 'Unknown', inputSchema: { type: 'object' }, connector: 'somenewthing' },
      ]),
      call: vi.fn(),
    }
    const services = await createServices({ client: fakeClient, backend: new MemoryBackend(), mcpClient })
    const tools = services.featureAgents.get('connectors')!.registry.all()
    const loc = (n: string) => tools.find((t) => t.name === n)?.permission?.locality
    expect(loc('read_file')).toBe('LOCAL')
    expect(loc('convert-contents')).toBe('LOCAL')
    expect(loc('mystery')).toBe('NETWORK') // unconfigured connector → consent-gated by default
  })
})
