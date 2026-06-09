import { Emitter } from '../../core/emitter'
import { debounce } from '../../core/storage/persistState'
import type { ScopedStore } from '../../core/storage/types'
import type { DocEditorStore } from './docEditorStore'

export interface DocMeta { id: string; name: string; updatedAt: number }
interface LibraryState { docs: DocMeta[]; activeId: string }
interface DocContent { name: string; text: string }

export class DocumentLibraryStore extends Emitter<LibraryState> {
  private state: LibraryState = { docs: [], activeId: '' }
  private docStore: DocEditorStore
  private scope: ScopedStore
  private genId: () => string
  private now: () => number
  private saveActive: () => void

  constructor(
    docStore: DocEditorStore,
    scope: ScopedStore,
    genId: () => string,
    now: () => number = () => Date.now(),
  ) {
    super()
    this.docStore = docStore
    this.scope = scope
    this.genId = genId
    this.now = now
    // Debounced save of the *active* document's content whenever the editor changes.
    this.saveActive = debounce(() => { void this.persistActiveContent() }, 400)
    this.docStore.subscribe(this.saveActive)
  }

  getState = (): LibraryState => this.state

  async init(): Promise<void> {
    let docs = (await this.scope.get<DocMeta[]>('index')) ?? []

    // Heal prior corruption: older builds minted doc ids from a counter that reset each reload, so the
    // index could accrue entries with duplicate ids (all pointing at the same doc:<id>). Keep the first.
    const seen = new Set<string>()
    const deduped = docs.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)))
    if (deduped.length !== docs.length) {
      docs = deduped
      await this.scope.set('index', docs)
    }

    if (docs.length === 0) {
      const legacy = await this.scope.get<DocContent>('current')
      if (legacy) {
        const id = this.genId()
        const name = legacy.name || 'Untitled.md'
        docs = [{ id, name, updatedAt: this.now() }]
        await this.scope.set(`doc:${id}`, { name, text: legacy.text ?? '' })
        await this.scope.set('index', docs)
        await this.scope.delete('current')
      }
    }
    if (docs.length === 0) {
      const id = this.genId()
      docs = [{ id, name: 'Untitled.md', updatedAt: this.now() }]
      await this.scope.set(`doc:${id}`, { name: 'Untitled.md', text: '' })
      await this.scope.set('index', docs)
    }

    const savedActive = await this.scope.get<string>('active')
    const activeId = docs.some((d) => d.id === savedActive) ? (savedActive as string) : docs[0].id
    this.state = { docs, activeId }
    await this.loadInto(activeId)
    await this.scope.set('active', activeId)
    this.notify()
  }

  async create(name?: string): Promise<void> {
    await this.persistActiveContent()
    const id = this.genId()
    const finalName = name ?? this.uniqueName()
    this.state = {
      docs: [...this.state.docs, { id, name: finalName, updatedAt: this.now() }],
      activeId: id,
    }
    await this.scope.set(`doc:${id}`, { name: finalName, text: '' })
    await this.scope.set('index', this.state.docs)
    await this.scope.set('active', id)
    this.docStore.hydrate({ name: finalName, text: '' })
    this.notify()
  }

  async setActive(id: string): Promise<void> {
    if (id === this.state.activeId) return
    await this.persistActiveContent()
    this.state = { ...this.state, activeId: id }
    await this.loadInto(id)
    await this.scope.set('active', id)
    this.notify()
  }

  async rename(id: string, name: string): Promise<void> {
    this.state = {
      ...this.state,
      docs: this.state.docs.map((d) => (d.id === id ? { ...d, name } : d)),
    }
    const content = (await this.scope.get<DocContent>(`doc:${id}`)) ?? { name, text: '' }
    await this.scope.set(`doc:${id}`, { ...content, name })
    await this.scope.set('index', this.state.docs)
    if (id === this.state.activeId) {
      this.docStore.hydrate({ ...this.docStore.getState(), name })
    }
    this.notify()
  }

  async delete(id: string): Promise<void> {
    const remaining = this.state.docs.filter((d) => d.id !== id)
    await this.scope.delete(`doc:${id}`)
    const wasActive = id === this.state.activeId
    this.state = { docs: remaining, activeId: wasActive ? '' : this.state.activeId }
    await this.scope.set('index', remaining)

    if (!wasActive) { this.notify(); return }

    if (remaining.length > 0) {
      this.state = { ...this.state, activeId: remaining[0].id }
      await this.loadInto(remaining[0].id)
      await this.scope.set('active', remaining[0].id)
      this.notify()
    } else {
      this.notify()
      await this.create() // activeId is '' so persistActiveContent no-ops
    }
  }

  private async loadInto(id: string): Promise<void> {
    const content = (await this.scope.get<DocContent>(`doc:${id}`)) ?? { name: this.metaName(id), text: '' }
    this.docStore.hydrate(content)
  }

  private async persistActiveContent(): Promise<void> {
    const id = this.state.activeId
    if (!id) return
    const content = this.docStore.getState()
    await this.scope.set(`doc:${id}`, content)
    this.state = {
      ...this.state,
      docs: this.state.docs.map((d) =>
        d.id === id ? { ...d, name: content.name, updatedAt: this.now() } : d,
      ),
    }
    await this.scope.set('index', this.state.docs)
    this.notify()
  }

  private metaName(id: string): string {
    return this.state.docs.find((d) => d.id === id)?.name ?? 'Untitled.md'
  }

  private uniqueName(): string {
    const names = new Set(this.state.docs.map((d) => d.name))
    if (!names.has('Untitled.md')) return 'Untitled.md'
    let i = 2
    while (names.has(`Untitled ${i}.md`)) i++
    return `Untitled ${i}.md`
  }
}
