import type { ToolDef } from '../../core/types'
import type { McpClient } from '../../core/mcp/mcpClient'
import type { DocEditorStore } from '../docEditor/docEditorStore'

/** Filename from a unix- or windows-style path (no node `path` in the browser). */
function basename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

/**
 * Lets the connector agent open a disk file into the Connectors scratch viewer: it reads the file
 * through the MCP bridge and hydrates the scratch store. `sourcePath` is retained so write-back to
 * disk can be added later. Read-only relative to the workspace — it does not touch the library.
 */
export function createOpenInViewerTool(opts: { client: McpClient; scratch: DocEditorStore }): ToolDef {
  return {
    name: 'open_in_viewer',
    description:
      'Open a file from a connector into the viewer so the user can see it. Pass the file `path` ' +
      '(use the filesystem connector tools to find it first). The contents are loaded into the ' +
      'viewer pane and returned to you. This does not modify the file or the user\'s documents.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Path of the file to open.' } },
      required: ['path'],
    },
    permission: {
      kind: 'read',
      resource: 'connector:filesystem:open_in_viewer',
      locality: 'LOCAL',
      describe: (args: unknown) => `Open "${(args as { path?: string })?.path ?? 'file'}" in the viewer?`,
    },
    handler: async (a: { path: string }) => {
      const r = await opts.client.call('read_file', { path: a.path })
      if (!r.ok) return { ok: false, error: r.error ?? 'could not read file' }
      const name = basename(a.path)
      opts.scratch.hydrate({ name, text: r.text, sourcePath: a.path })
      return { ok: true, name, text: r.text }
    },
  }
}
