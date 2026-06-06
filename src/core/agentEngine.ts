import { Emitter } from './emitter'
import type { LlamaClient } from './llamaClient'
import type { Registry } from './registry'
import type { PermissionBroker } from './permissionBroker'
import type { ChatMessage, ToolCall } from './types'

interface AgentState { messages: ChatMessage[]; streaming: string; busy: boolean }
const MAX_ITERS = 5

export class AgentEngine extends Emitter<AgentState> {
  private state: AgentState = { messages: [], streaming: '', busy: false }
  private client: Pick<LlamaClient, 'chat'>
  private registry: Registry
  private broker: PermissionBroker

  constructor(client: Pick<LlamaClient, 'chat'>, registry: Registry, broker: PermissionBroker) {
    super()
    this.client = client
    this.registry = registry
    this.broker = broker
  }

  getState = (): AgentState => this.state

  /** Seed (or replace) the system prompt as the first message. */
  seedSystem(prompt: string): void {
    this.set({
      messages: [
        { role: 'system', content: prompt },
        ...this.state.messages.filter((m) => m.role !== 'system'),
      ],
    })
  }

  private set(patch: Partial<AgentState>): void {
    this.state = { ...this.state, ...patch }
    this.notify()
  }

  async run(userText: string): Promise<string> {
    const messages: ChatMessage[] = [...this.state.messages, { role: 'user', content: userText }]
    this.set({ messages, busy: true, streaming: '' })

    let final = ''
    for (let iter = 0; iter < MAX_ITERS; iter++) {
      let streamed = ''
      const result = await this.client.chat(this.state.messages, this.registry.all(), (tok) => {
        streamed += tok
        this.set({ streaming: streamed })
      })

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.content,
        toolCalls: result.toolCalls.length ? result.toolCalls : undefined,
      }
      this.set({ messages: [...this.state.messages, assistantMsg], streaming: '' })

      if (!result.toolCalls.length) { final = result.content; break }

      for (const call of result.toolCalls) {
        const toolResult = await this.dispatch(call)
        this.set({
          messages: [...this.state.messages, {
            role: 'tool', toolCallId: call.id, content: toolResult,
          }],
        })
      }
    }

    this.set({ busy: false })
    return final
  }

  private async dispatch(call: ToolCall): Promise<string> {
    const tool = this.registry.get(call.name)
    if (!tool) return JSON.stringify({ error: `Unknown tool: ${call.name}` })

    let args: unknown = {}
    try { args = call.arguments ? JSON.parse(call.arguments) : {} } catch { args = {} }

    if (tool.permission) {
      const allowed = await this.broker.request(tool.permission, args)
      if (!allowed) {
        return JSON.stringify({ denied: true, message: 'User denied permission for this action.' })
      }
    }

    try {
      const out = await tool.handler(args)
      return typeof out === 'string' ? out : JSON.stringify(out)
    } catch (e) {
      return JSON.stringify({ error: (e as Error).message })
    }
  }
}
