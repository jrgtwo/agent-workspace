import { Emitter } from '../../core/emitter'
import type { McpClient } from '../../core/mcp/mcpClient'
import type { DocEditorStore } from '../docEditor/docEditorStore'
import { writeFileToDisk } from './connectorsFs'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export interface ConnectorsSaveState { dirty: boolean; status: SaveStatus; error?: string }

/**
 * Owns the save lifecycle for the connectors scratch viewer: tracks unsaved changes against a
 * baseline (the file's content as last loaded/saved) and writes the current text back to its
 * source path. User-driven — the Save click is the authorization, so it does not go through the
 * PermissionBroker (agent-initiated saves, added later, will).
 */
export class ConnectorsSaveStore extends Emitter<ConnectorsSaveState> {
  private state: ConnectorsSaveState = { dirty: false, status: 'idle' }
  private client: McpClient
  private scratch: DocEditorStore
  private baseline: string
  private lastSourcePath: string | undefined

  constructor(deps: { client: McpClient; scratch: DocEditorStore }) {
    super()
    this.client = deps.client
    this.scratch = deps.scratch
    this.baseline = deps.scratch.getState().text
    this.lastSourcePath = deps.scratch.getState().sourcePath
    deps.scratch.subscribe(this.onScratch)
  }

  getState = (): ConnectorsSaveState => this.state

  /** Treat the current text as the on-disk content (used to absorb editor load-normalization). */
  rebaseline(): void {
    this.baseline = this.scratch.getState().text
    this.update({ dirty: false, status: 'idle' })
  }

  async save(): Promise<void> {
    const { text, sourcePath } = this.scratch.getState()
    if (!sourcePath) return
    this.update({ dirty: this.state.dirty, status: 'saving' })
    const r = await writeFileToDisk(this.client, sourcePath, text)
    if (r.ok) {
      this.baseline = text
      this.update({ dirty: false, status: 'saved' })
    } else {
      this.update({ dirty: true, status: 'error', error: r.error })
    }
  }

  private onScratch = (): void => {
    const s = this.scratch.getState()
    if (s.sourcePath !== this.lastSourcePath) {
      // A different file was opened: its loaded content is the new baseline.
      this.lastSourcePath = s.sourcePath
      this.baseline = s.text
      this.update({ dirty: false, status: 'idle' })
      return
    }
    const dirty = !!s.sourcePath && s.text !== this.baseline
    // A fresh edit clears a stale saved/error status; reverting keeps the prior status.
    this.update(dirty ? { dirty: true, status: 'idle' } : { dirty: false, status: this.state.status })
  }

  private update(next: ConnectorsSaveState): void {
    if (next.dirty === this.state.dirty && next.status === this.state.status && next.error === this.state.error) return
    this.state = next
    this.notify()
  }
}
