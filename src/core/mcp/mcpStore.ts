import { Emitter } from '../emitter'

export interface ConnectorTool { name: string; description: string }
export interface McpState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  tools: ConnectorTool[]
  error?: string
}

/** Drives the Connectors panel: bridge connection status + the live tool list. */
export class McpStore extends Emitter<McpState> {
  private state: McpState = { status: 'idle', tools: [] }

  getState = (): McpState => this.state

  setLoading(): void {
    this.state = { ...this.state, status: 'loading', error: undefined }
    this.notify()
  }

  setReady(tools: ConnectorTool[]): void {
    this.state = { status: 'ready', tools }
    this.notify()
  }

  setError(error: string): void {
    this.state = { status: 'error', tools: [], error }
    this.notify()
  }
}
