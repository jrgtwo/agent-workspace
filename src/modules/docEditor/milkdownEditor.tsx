/**
 * MilkdownEditor — React wrapper around the Milkdown WYSIWYG editor.
 *
 * Props match the existing MarkdownEditor contract so this component can be
 * swapped in later (M6) without changing call sites:
 *   <MilkdownEditor store={store} saveImage={fn} />
 *
 * Loop guards:
 *   editor→store: onChange fires on every Milkdown update; we only call
 *     store.setText when the markdown actually differs from the last
 *     serialized value.
 *   store→editor: the store subscription replaceAll's the editor content
 *     only when the incoming text differs from lastSerialized (i.e. was
 *     changed externally, not by typing).
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { MilkdownProvider, Milkdown, useEditor } from '@milkdown/react'
import { replaceAll } from '@milkdown/kit/utils'
import type { DocEditorStore } from './docEditorStore'
import { buildMilkdownEditor } from './milkdown/editorConfig'
import { EditorToolbar } from './EditorToolbar'
import { EditorContextMenu } from './EditorContextMenu'
import type { MenuPick } from './milkdown/commands'
import { runInline, runBlock } from './milkdown/commands'
import './milkdown/editor.css'

interface Props {
  store: DocEditorStore
  saveImage?: (file: File) => Promise<string>
}

type ContextMenuState = { x: number; y: number; hasSelection: boolean } | null

function MilkdownInner({ store, saveImage }: Props) {
  const lastSerialized = useRef<string>(store.getState().text)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)

  const { get } = useEditor((root) => {
    return buildMilkdownEditor({
      root,
      defaultValue: store.getState().text,
      onChange(md) {
        lastSerialized.current = md
        if (md !== store.getState().text) {
          store.setText(md)
        }
      },
      saveImage,
    })
  }, [store, saveImage])

  // store→editor sync: push external text changes into the editor
  useEffect(() => {
    return store.subscribe(() => {
      const next = store.getState().text
      if (next === lastSerialized.current) return
      const editor = get()
      if (!editor) return
      lastSerialized.current = next
      editor.action(replaceAll(next))
    })
  }, [store, get])

  const runPick = useCallback((pick: MenuPick) => {
    const editor = get()
    if (!editor) return
    if (pick.type === 'inline') {
      editor.action(runInline(pick.kind))
    } else {
      editor.action(runBlock(pick.kind))
    }
    // Return focus to the editor after dispatching
    const editorEl = document.querySelector<HTMLElement>('[aria-label="document"]')
    editorEl?.focus()
  }, [get])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const sel = window.getSelection()
    const hasSelection = sel != null && sel.toString().length > 0
    setContextMenu({ x: e.clientX, y: e.clientY, hasSelection })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <EditorToolbar onCommand={runPick} />
      <div style={{ flex: 1, overflow: 'auto' }} onContextMenu={handleContextMenu}>
        <Milkdown />
      </div>
      {contextMenu && (
        <EditorContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          hasSelection={contextMenu.hasSelection}
          onPick={(pick) => { runPick(pick); setContextMenu(null) }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

export function MilkdownEditor({ store, saveImage }: Props) {
  return (
    <MilkdownProvider>
      <MilkdownInner store={store} saveImage={saveImage} />
    </MilkdownProvider>
  )
}
