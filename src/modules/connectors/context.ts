import type { McpStore } from '../../core/mcp/mcpStore'

/** Live snapshot of available connector tools for the agent's system prompt. */
export function describeConnectorsContext(store: McpStore): string {
  const { status, tools } = store.getState()
  if (status !== 'ready' || tools.length === 0) {
    return 'No connector tools are currently available (the MCP bridge may not be running). If the user asks you to use one, tell them to start the bridge and hit Refresh.'
  }
  return [
    `You have ${tools.length} connector tool${tools.length === 1 ? '' : 's'} available:`,
    ...tools.map((t) => `  - ${t.name}: ${t.description}`),
    "Use them to fulfill the user's request. Each call asks the user to approve it first.",
  ].join('\n')
}
