import type { ChatMessage, ToolCall, ToolDef } from './types'

export interface ChatResult { content: string; toolCalls: ToolCall[] }

interface ToolCallAccum { id: string; name: string; arguments: string }

export class LlamaClient {
  private baseUrl: string
  private model: string
  private fetchImpl: typeof fetch

  constructor(baseUrl: string, model: string, fetchImpl: typeof fetch = fetch) {
    this.baseUrl = baseUrl
    this.model = model
    this.fetchImpl = fetchImpl
  }

  toOpenAITools(tools: ToolDef[]) {
    return tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }))
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDef[],
    onToken: (t: string) => void,
    signal?: AbortSignal,
  ): Promise<ChatResult> {
    let res: Response
    // Detach from `this`: the native browser `fetch` throws "Illegal invocation" when
    // called as a method (this !== window). A local binding calls it with this=undefined.
    const doFetch = this.fetchImpl
    try {
      res = await doFetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          model: this.model,
          stream: true,
          messages: messages.map(this.toWireMessage),
          ...(tools.length ? { tools: this.toOpenAITools(tools) } : {}),
        }),
      })
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      throw new Error('Local model not reachable. Is llama-server running on localhost?')
    }
    if (!res.ok || !res.body) {
      throw new Error(`Local model error (HTTP ${res.status}).`)
    }
    return this.readStream(res.body, onToken)
  }

  private toWireMessage = (m: ChatMessage) => {
    if (m.role === 'tool') {
      return { role: 'tool', tool_call_id: m.toolCallId, content: m.content }
    }
    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'assistant',
        content: m.content,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id, type: 'function', function: { name: tc.name, arguments: tc.arguments },
        })),
      }
    }
    return { role: m.role, content: m.content }
  }

  private async readStream(
    body: ReadableStream<Uint8Array>,
    onToken: (t: string) => void,
  ): Promise<ChatResult> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let content = ''
    const toolCalls = new Map<number, ToolCallAccum>()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue
        let parsed: any
        try { parsed = JSON.parse(data) } catch { continue }
        const delta = parsed?.choices?.[0]?.delta
        if (!delta) continue
        if (typeof delta.content === 'string') {
          content += delta.content
          onToken(delta.content)
        }
        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0
            const acc = toolCalls.get(idx) ?? { id: '', name: '', arguments: '' }
            if (tc.id) acc.id = tc.id
            if (tc.function?.name) acc.name = tc.function.name
            if (tc.function?.arguments) acc.arguments += tc.function.arguments
            toolCalls.set(idx, acc)
          }
        }
      }
    }
    return {
      content,
      toolCalls: [...toolCalls.values()].map((a) => ({ id: a.id, name: a.name, arguments: a.arguments })),
    }
  }
}
