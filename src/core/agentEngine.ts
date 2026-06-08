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
  readonly surfaceId: string
  private controller: AbortController | null = null

  constructor(client: Pick<LlamaClient, 'chat'>, registry: Registry, broker: PermissionBroker, surfaceId = 'agent') {
    super()
    this.client = client
    this.registry = registry
    this.broker = broker
    this.surfaceId = surfaceId
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

  /** Restore a previously persisted conversation. Call seedSystem() afterward. */
  hydrateMessages(messages: ChatMessage[]): void {
    this.set({ messages })
  }

  /** Abort the in-flight run (if any). The run resolves to '' without error. */
  stop(): void {
    this.controller?.abort()
  }

  private set(patch: Partial<AgentState>): void {
    this.state = { ...this.state, ...patch }
    this.notify()
  }

  async run(userText: string): Promise<string> {
    const messages: ChatMessage[] = [...this.state.messages, { role: 'user', content: userText }]
    this.set({ messages, busy: true, streaming: '' })
    const controller = new AbortController()
    this.controller = controller

    try {
      for (let iter = 0; iter < MAX_ITERS; iter++) {
        let streamed = ''
        const result = await this.client.chat(this.state.messages, this.registry.all(), (tok) => {
          streamed += tok
          this.set({ streaming: streamed })
        }, controller.signal)

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: result.content,
          toolCalls: result.toolCalls.length ? result.toolCalls : undefined,
        }
        this.set({ messages: [...this.state.messages, assistantMsg], streaming: '' })

        if (!result.toolCalls.length) return result.content

        for (const call of result.toolCalls) {
          const toolResult = await this.dispatch(call)
          this.set({
            messages: [...this.state.messages, {
              role: 'tool', toolCallId: call.id, content: toolResult,
            }],
          })
        }
      }
      return ''
    } catch (e) {
      // A user-initiated stop aborts the model call; resolve quietly instead of surfacing an error.
      if (controller.signal.aborted || (e as Error).name === 'AbortError') return ''
      throw e
    } finally {
      this.controller = null
      // Always clear busy/streaming, even if the model call throws — otherwise one
      // failure wedges the UI (Send stays disabled, no further requests fire).
      this.set({ busy: false, streaming: '' })
    }
  }

  private async dispatch(call: ToolCall): Promise<string> {
    const tool = this.registry.get(call.name)
    if (!tool) return JSON.stringify({ error: `Unknown tool: ${call.name}` })

    let args: unknown = {}
    try { args = call.arguments ? JSON.parse(call.arguments) : {} } catch { args = {} }

    if (tool.permission) {
      const allowed = await this.broker.request(tool.permission, args, this.surfaceId)
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
