// Pure helper (NO MCP SDK import): combine multiple servers' tool lists into one flat, connector-tagged
// list plus a name→connector index. First server to claim a tool name wins; duplicates are reported.
export function buildToolIndex(serverEntries) {
  const tools = []
  const index = new Map()
  const collisions = []
  for (const { connectorId, tools: serverTools } of serverEntries) {
    for (const t of serverTools ?? []) {
      if (index.has(t.name)) { collisions.push(t.name); continue }
      index.set(t.name, connectorId)
      tools.push({ name: t.name, description: t.description ?? '', inputSchema: t.inputSchema, connector: connectorId })
    }
  }
  return { tools, index, collisions }
}
