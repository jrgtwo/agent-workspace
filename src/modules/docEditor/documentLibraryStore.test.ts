import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DocumentLibraryStore } from './documentLibraryStore'
import { DocEditorStore } from './docEditorStore'
import { StorageService } from '../../core/storage/storage'
import { MemoryBackend } from '../../core/storage/memoryBackend'

let n = 0
const genId = () => `d-${++n}`
const now = () => 1000

function setup() {
  const backend = new MemoryBackend()
  const scope = new StorageService(backend).scope('doc-editor')
  const docStore = new DocEditorStore('Untitled.md', '')
  const lib = new DocumentLibraryStore(docStore, scope, genId, now)
  return { backend, scope, docStore, lib }
}

describe('DocumentLibraryStore', () => {
  beforeEach(() => { n = 0 })

  it('init auto-creates a first document when storage is empty', async () => {
    const { lib, docStore, backend } = setup()
    await lib.init()
    expect(lib.getState().docs).toHaveLength(1)
    expect(lib.getState().docs[0].name).toBe('Untitled.md')
    expect(lib.getState().activeId).toBe(lib.getState().docs[0].id)
    expect(docStore.getState()).toEqual({ name: 'Untitled.md', text: '' })
    expect(await backend.get('doc-editor', 'index')).toHaveLength(1)
  })

  it('init imports a legacy single-document `current` as the first document', async () => {
    const { lib, docStore, scope } = setup()
    await scope.set('current', { name: 'Notes.md', text: 'legacy body' })
    await lib.init()
    expect(lib.getState().docs.map((d) => d.name)).toEqual(['Notes.md'])
    expect(docStore.getState().text).toBe('legacy body')
    expect(await scope.get('current')).toBeUndefined() // consumed
  })

  it('create adds a doc, makes it active, persists index+active, and clears the editor', async () => {
    const { lib, docStore, backend } = setup()
    await lib.init()
    await lib.create()
    expect(lib.getState().docs).toHaveLength(2)
    expect(lib.getState().docs[1].name).toBe('Untitled 2.md')
    expect(lib.getState().activeId).toBe(lib.getState().docs[1].id)
    expect(docStore.getState().text).toBe('')
    expect(await backend.get('doc-editor', 'active')).toBe(lib.getState().docs[1].id)
  })

  it('setActive saves the outgoing doc and loads the incoming doc', async () => {
    const { lib, docStore } = setup()
    await lib.init()
    const first = lib.getState().docs[0].id
    docStore.setText('first body')          // edit doc 1
    await lib.create()                       // doc 2 active, empty
    docStore.setText('second body')          // edit doc 2
    await lib.setActive(first)               // back to doc 1
    expect(docStore.getState().text).toBe('first body')
    await lib.setActive(lib.getState().docs[1].id)
    expect(docStore.getState().text).toBe('second body')
  })

  it('rename updates the index, the stored content, and the active editor name', async () => {
    const { lib, docStore, scope } = setup()
    await lib.init()
    const id = lib.getState().docs[0].id
    await lib.rename(id, 'Renamed.md')
    expect(lib.getState().docs[0].name).toBe('Renamed.md')
    expect(docStore.getState().name).toBe('Renamed.md')
    expect((await scope.get<{ name: string }>(`doc:${id}`))!.name).toBe('Renamed.md')
  })

  it('delete removes the doc; deleting the active doc switches to another', async () => {
    const { lib, scope } = setup()
    await lib.init()
    const first = lib.getState().docs[0].id
    await lib.create() // second, active
    const second = lib.getState().docs[1].id
    await lib.delete(second)
    expect(lib.getState().docs.map((d) => d.id)).toEqual([first])
    expect(lib.getState().activeId).toBe(first)
    expect(await scope.get(`doc:${second}`)).toBeUndefined()
  })

  it('deleting the last document auto-creates a fresh empty one', async () => {
    const { lib } = setup()
    await lib.init()
    const only = lib.getState().docs[0].id
    await lib.delete(only)
    expect(lib.getState().docs).toHaveLength(1)
    expect(lib.getState().docs[0].id).not.toBe(only)
    expect(lib.getState().activeId).toBe(lib.getState().docs[0].id)
  })

  it('persists active-document edits to doc:<id> (debounced)', async () => {
    const { lib, docStore, backend } = setup()
    await lib.init()
    const id = lib.getState().activeId
    docStore.setText('edited content')
    await vi.waitFor(async () => {
      expect((await backend.get('doc-editor', `doc:${id}`)) as { text: string }).toMatchObject({ text: 'edited content' })
    })
  })

  it('init drops index entries with duplicate ids (heals prior counter-collision corruption)', async () => {
    const { lib, scope } = setup()
    await scope.set('index', [
      { id: 'id-1', name: 'A.md', updatedAt: 1 },
      { id: 'id-1', name: 'B.md', updatedAt: 2 }, // collided id from the old resetting counter
      { id: 'id-2', name: 'C.md', updatedAt: 3 },
    ])
    await scope.set('doc:id-1', { name: 'A.md', text: 'AAA' })
    await scope.set('doc:id-2', { name: 'C.md', text: 'CCC' })

    await lib.init()

    expect(lib.getState().docs.map((d) => d.id)).toEqual(['id-1', 'id-2']) // duplicate dropped
    expect(await scope.get('index')).toHaveLength(2) // healed index persisted
  })
})
