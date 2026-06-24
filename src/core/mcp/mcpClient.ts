export interface McpToolInfo {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  connector?: string
}

export interface McpCallResult {
  ok: boolean
  text: string
  error?: string
}

/** Talks to the local MCP bridge over HTTP (Vite-proxied at /mcp). */
export class McpClient {
  private baseUrl: string
  private fetchImpl: typeof fetch

  constructor(baseUrl: string, fetchImpl: typeof fetch = fetch) {
    this.baseUrl = baseUrl
    this.fetchImpl = fetchImpl
  }

  async listTools(): Promise<McpToolInfo[]> {
    const f = this.fetchImpl // call fetch UNBOUND (repo gotcha: this.fetchImpl(...) throws "Illegal invocation")
    const res = await f(`${this.baseUrl}/tools`)
    if (!res.ok) throw new Error(`MCP bridge /tools returned ${res.status}`)
    const data = (await res.json()) as { tools?: McpToolInfo[] }
    return data.tools ?? []
  }

  async call(name: string, args: unknown): Promise<McpCallResult> {
    const f = this.fetchImpl
    const res = await f(`${this.baseUrl}/call`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, arguments: args ?? {} }),
    })
    const data = (await res.json()) as { ok?: boolean; text?: string; error?: string }
    return { ok: data.ok ?? res.ok, text: data.text ?? '', error: data.error }
  }
}
