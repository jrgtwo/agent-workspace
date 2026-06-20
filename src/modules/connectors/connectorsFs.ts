import type { McpClient } from '../../core/mcp/mcpClient'

/** Filename from a unix- or windows-style path (no node `path` in the browser). */
export function basename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

/**
 * Write a file back to disk through the MCP bridge's filesystem connector. Factored out so both the
 * user-driven Save (direct, the click is the authorization) and a future broker-gated agent
 * save_file tool can share one write path.
 */
export async function writeFileToDisk(client: McpClient, path: string, content: string): Promise<{ ok: boolean; error?: string }> {
  const r = await client.call('write_file', { path, content })
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? 'could not write file' }
}
