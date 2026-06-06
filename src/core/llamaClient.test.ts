import { describe, it, expect, vi } from 'vitest'
import { LlamaClient } from './llamaClient'

function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(`data: ${c}\n\n`))
      controller.enqueue(enc.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
}

describe('LlamaClient', () => {
  it('assembles streamed content and fires onToken', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(sseStream([
        JSON.stringify({ choices: [{ delta: { content: 'He' } }] }),
        JSON.stringify({ choices: [{ delta: { content: 'llo' } }] }),
      ]), { status: 200 }),
    )
    const client = new LlamaClient('http://localhost:8080/v1', 'local', fetchMock as any)
    const tokens: string[] = []
    const res = await client.chat([{ role: 'user', content: 'hi' }], [], (t) => tokens.push(t))
    expect(res.content).toBe('Hello')
    expect(tokens).toEqual(['He', 'llo'])
    expect(res.toolCalls).toEqual([])
  })

  it('assembles streamed tool calls across deltas', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(sseStream([
        JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'read_document', arguments: '' } }] } }] }),
        JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{}' } }] } }] }),
        JSON.stringify({ choices: [{ finish_reason: 'tool_calls', delta: {} }] }),
      ]), { status: 200 }),
    )
    const client = new LlamaClient('http://localhost:8080/v1', 'local', fetchMock as any)
    const res = await client.chat([{ role: 'user', content: 'help' }], [], () => {})
    expect(res.toolCalls).toEqual([{ id: 'call_1', name: 'read_document', arguments: '{}' }])
  })

  it('throws a clear error when the server is unreachable', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    const client = new LlamaClient('http://localhost:8080/v1', 'local', fetchMock as any)
    await expect(client.chat([{ role: 'user', content: 'hi' }], [], () => {}))
      .rejects.toThrow(/Local model not reachable/)
  })
})
