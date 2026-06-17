import type { ToolDef, PermissionScope, DataLocality } from '../types'
import type { McpClient, McpToolInfo } from './mcpClient'

export interface AdaptOpts {
  client: McpClient
  connectorId: string
  locality?: DataLocality
}

/** Map one MCP tool to a broker-gated ToolDef whose handler proxies to the bridge. */
export function toToolDef(tool: McpToolInfo, opts: AdaptOpts): ToolDef {
  const locality: DataLocality = opts.locality ?? 'NETWORK'
  const permission: PermissionScope = {
    kind: 'write', // connector calls may have side effects → use the stronger gate by default
    resource: `connector:${opts.connectorId}:${tool.name}`,
    locality,
    describe: () => `Run connector tool "${tool.name}" (${opts.connectorId})?`,
  }
  return {
    name: tool.name,
    description: tool.description || `Connector tool ${tool.name}`,
    parameters: (tool.inputSchema as Record<string, unknown>) ?? { type: 'object', properties: {} },
    permission,
    handler: async (args: unknown) => {
      const r = await opts.client.call(tool.name, args)
      if (!r.ok) return { ok: false, error: r.error ?? 'connector call failed' }
      return { ok: true, result: r.text }
    },
  }
}

export function toToolDefs(tools: McpToolInfo[], opts: AdaptOpts): ToolDef[] {
  return tools.map((t) => toToolDef(t, opts))
}
