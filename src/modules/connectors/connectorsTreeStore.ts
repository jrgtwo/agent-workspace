import { Emitter } from '../../core/emitter'
import type { McpClient } from '../../core/mcp/mcpClient'
import { parseAllowedDirs, parseDirectoryTree, type TreeNode } from './connectorsTreeParse'

export type TreeStatus = 'idle' | 'loading' | 'ready' | 'error'
export interface ConnectorsTreeState {
  status: TreeStatus
  roots: TreeNode[]
  error?: string
}

function basename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

/**
 * Drives the connector file-tree pane: discovers the allowed root directories, then reads each one's
 * tree eagerly (expand/collapse is client-side). Browsing is human-driven, so it talks to the
 * bridge directly (no broker prompt) — the same posture as the user-driven Save.
 */
export class ConnectorsTreeStore extends Emitter<ConnectorsTreeState> {
  private state: ConnectorsTreeState = { status: 'idle', roots: [] }
  private client: McpClient

  constructor(deps: { client: McpClient }) {
    super()
    this.client = deps.client
  }

  getState = (): ConnectorsTreeState => this.state

  async load(): Promise<void> {
    this.set({ status: 'loading', roots: [] })
    try {
      const allowed = await this.client.call('list_allowed_directories', {})
      if (!allowed.ok) throw new Error(allowed.error ?? 'could not list allowed directories')
      const dirs = parseAllowedDirs(allowed.text)
      const roots: TreeNode[] = []
      for (const dir of dirs) {
        const tree = await this.client.call('directory_tree', { path: dir })
        if (!tree.ok) throw new Error(tree.error ?? `could not read ${dir}`)
        roots.push({ name: basename(dir), path: dir, type: 'directory', children: parseDirectoryTree(dir, tree.text) })
      }
      this.set({ status: 'ready', roots })
    } catch (err) {
      this.set({ status: 'error', roots: [], error: err instanceof Error ? err.message : String(err) })
    }
  }

  private set(next: ConnectorsTreeState): void {
    this.state = next
    this.notify()
  }
}
