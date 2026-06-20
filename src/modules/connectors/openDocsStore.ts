import { Emitter } from '../../core/emitter'
import type { McpClient } from '../../core/mcp/mcpClient'
import { DocEditorStore } from '../docEditor/docEditorStore'
import { ConnectorsSaveStore } from './connectorsSaveStore'
import { basename } from './connectorsFs'

export interface OpenDoc { path: string; name: string; doc: DocEditorStore; save: ConnectorsSaveStore }
export interface OpenDocsState { tabs: { path: string; name: string; dirty: boolean }[]; activePath?: string }

export class OpenDocsStore extends Emitter<OpenDocsState> {
  private state: OpenDocsState = { tabs: [] }
  private docs: OpenDoc[] = []
  private client: McpClient

  constructor(client: McpClient) { super(); this.client = client }

  getState = (): OpenDocsState => this.state
  activeDoc = (): OpenDoc | undefined => this.docs.find((d) => d.path === this.state.activePath)

  async open(path: string): Promise<void> {
    if (this.docs.some((d) => d.path === path)) { this.activate(path); return }
    const r = await this.client.call('read_file', { path })
    if (!r.ok) return
    const name = basename(path)
    const doc = new DocEditorStore(name)
    doc.hydrate({ name, text: r.text, sourcePath: path })
    const save = new ConnectorsSaveStore({ client: this.client, scratch: doc })
    doc.subscribe(() => this.sync())
    save.subscribe(() => this.sync())
    this.docs.push({ path, name, doc, save })
    this.state = { ...this.state, activePath: path }
    this.sync()
    // Absorb the editor's load-time markdown normalization (Milkdown re-serializes on mount),
    // which would otherwise mark a freshly-opened file dirty. Re-baseline once, shortly after open.
    setTimeout(() => save.rebaseline(), 50)
  }

  activate(path: string): void {
    if (!this.docs.some((d) => d.path === path)) return
    this.state = { ...this.state, activePath: path }
    this.sync()
  }

  close(path: string): void {
    const i = this.docs.findIndex((d) => d.path === path)
    if (i < 0) return
    this.docs.splice(i, 1)
    let activePath = this.state.activePath
    if (activePath === path) activePath = this.docs[Math.max(0, i - 1)]?.path
    this.state = { ...this.state, activePath }
    this.sync()
  }

  private sync(): void {
    this.state = {
      activePath: this.state.activePath,
      tabs: this.docs.map((d) => ({ path: d.path, name: d.name, dirty: d.save.getState().dirty })),
    }
    this.notify()
  }
}
