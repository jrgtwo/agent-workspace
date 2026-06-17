// mcp-bridge/server.mjs
// Local stdio<->HTTP bridge: the browser can't speak stdio MCP, so this Node process does.
// It launches one MCP server (filesystem) over stdio and exposes GET /tools + POST /call.
// Run it like llama-server; Vite proxies /mcp -> here. The user runs this, not the app.
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const PORT = Number(process.env.MCP_BRIDGE_PORT ?? 5175)
const FS_DIR = process.env.MCP_FS_DIR ?? fileURLToPath(new URL('../mcp-sandbox/', import.meta.url))

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', FS_DIR],
})
const client = new Client({ name: 'agent-practice-bridge', version: '1.0.0' })
try {
  await client.connect(transport)
} catch (err) {
  console.error(
    `[mcp-bridge] could not launch the filesystem server.\n` +
    `  reason: ${err?.message ?? err}\n` +
    `  check: MCP_FS_DIR exists (currently: ${FS_DIR}), and that the first run can download\n` +
    `  @modelcontextprotocol/server-filesystem via npx (needs network once).`,
  )
  process.exit(1)
}
console.log(`[mcp-bridge] connected to filesystem server (dir: ${FS_DIR})`)

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
      const { tools } = await client.listTools()
      return send(res, 200, {
        tools: (tools ?? []).map((t) => ({ name: t.name, description: t.description ?? '', inputSchema: t.inputSchema })),
      })
    }
    if (req.method === 'POST' && req.url === '/call') {
      const { name, arguments: args } = JSON.parse((await readBody(req)) || '{}')
      const result = await client.callTool({ name, arguments: args ?? {} })
      const text = (result.content ?? [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('\n')
      return send(res, 200, result.isError ? { ok: false, error: text || 'connector tool reported an error' } : { ok: true, text })
    }
    send(res, 404, { ok: false, error: 'not found' })
  } catch (err) {
    send(res, 500, { ok: false, error: String(err?.message ?? err) })
  }
})
server.listen(PORT, () => console.log(`[mcp-bridge] HTTP listening on http://localhost:${PORT}`))
