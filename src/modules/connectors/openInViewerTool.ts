import type { ToolDef } from '../../core/types'
import type { OpenDocsStore } from './openDocsStore'

export function createOpenInViewerTool(opts: { open: OpenDocsStore }): ToolDef {
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
      await opts.open.open(a.path)
      const d = opts.open.activeDoc()
      return d && d.path === a.path
        ? { ok: true, name: d.name, text: d.doc.getState().text }
        : { ok: false, error: 'could not open file' }
    },
  }
}
