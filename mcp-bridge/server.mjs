// mcp-bridge/server.mjs
// Local stdio<->HTTP bridge: the browser can't speak stdio MCP, so this Node process does.
// It launches multiple MCP servers over stdio and exposes GET /tools + POST /call.
// Run it like llama-server; Vite proxies /mcp -> here. The user runs this, not the app.
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { buildToolIndex } from './toolIndex.mjs'

const PORT = Number(process.env.MCP_BRIDGE_PORT ?? 5175)
const FS_DIR = process.env.MCP_FS_DIR ?? fileURLToPath(new URL('../mcp-sandbox/', import.meta.url))

// The servers this bridge hosts. Add entries here to expose more connectors (Phase 2: move to config/UI).
const SERVERS = [
  { id: 'filesystem', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', FS_DIR] },
  { id: 'pandoc', command: 'uvx', args: ['mcp-pandoc'], cwd: FS_DIR }, // cwd = sandbox; pandoc is not self-sandboxed
]

const clients = new Map() // connectorId → Client
const serverEntries = []  // { connectorId, tools } for buildToolIndex
for (const s of SERVERS) {
  const transport = new StdioClientTransport({ command: s.command, args: s.args, cwd: s.cwd })
  const client = new Client({ name: `agent-practice-bridge-${s.id}`, version: '1.0.0' })
  let tools
  try {
    await client.connect(transport)
    ;({ tools } = await client.listTools())
  } catch (err) {
    console.error(`[mcp-bridge] could not launch "${s.id}" (${s.command}): ${err?.message ?? err} — skipping`)
    continue
  }
  clients.set(s.id, client)
  serverEntries.push({ connectorId: s.id, tools: tools ?? [] })
  console.log(`[mcp-bridge] connected "${s.id}" (${(tools ?? []).length} tools)`)
}
if (clients.size === 0) {
  console.error('[mcp-bridge] no servers connected — exiting')
  process.exit(1)
}
const { tools: allTools, index, collisions } = buildToolIndex(serverEntries)
for (const name of collisions) console.warn(`[mcp-bridge] tool name collision on "${name}" — keeping the first; consider prefixing`)

const send = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}
const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => { data += c })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/tools') {
      return send(res, 200, { tools: allTools })
    }
    if (req.method === 'POST' && req.url === '/call') {
      const { name, arguments: args } = JSON.parse((await readBody(req)) || '{}')
      const connectorId = index.get(name)
      const client = connectorId && clients.get(connectorId)
      if (!client) return send(res, 404, { ok: false, error: `unknown tool "${name}"` })
      const result = await client.callTool({ name, arguments: args ?? {} })
      const text = (result.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('\n')
      return send(res, 200, result.isError ? { ok: false, error: text || 'connector tool reported an error' } : { ok: true, text })
    }
    send(res, 404, { ok: false, error: 'not found' })
  } catch (err) {
    send(res, 500, { ok: false, error: String(err?.message ?? err) })
  }
})
server.listen(PORT, () => console.log(`[mcp-bridge] HTTP listening on http://localhost:${PORT}`))
