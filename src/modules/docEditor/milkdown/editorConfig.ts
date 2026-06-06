/**
 * Core Milkdown editor factory.
 *
 * Creates a fully configured Milkdown Editor instance and calls .create().
 * Includes: commonmark, gfm, history, clipboard, listener (onChange), and
 * optional image paste/drop handling.
 *
 * Note: This function is used in standalone / test contexts.
 * For React usage, see milkdownEditor.tsx which calls Editor.make() directly
 * so that useEditor can manage the create()/destroy() lifecycle.
 */

import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { imageMarkdown } from '../markdown/images'

export interface MilkdownEditorOptions {
  root: HTMLElement
  defaultValue: string
  onChange: (md: string) => void
  /** Optional: called with a pasted/dropped image File; should return a blob ID string. */
  saveImage?: (file: File) => Promise<string>
}

/** Build the image paste/drop ProseMirror plugin. */
function imagePastePlugin(saveImage: (f: File) => Promise<string>) {
  return $prose(() =>
    new Plugin({
      key: new PluginKey('milkdown-image-paste'),
      props: {
        handlePaste(_view, event) {
          const items = event.clipboardData?.items
          if (!items) return false
          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              const file = item.getAsFile()
              if (!file) continue
              event.preventDefault()
              void saveImage(file).then((id) => {
                // Re-focus the editor and insert the markdown image snippet.
                // We insert via a DOM-level document.execCommand fallback so we
                // don't need a reference to the view inside the closure.
                document.execCommand('insertText', false, imageMarkdown(id, file.name))
              })
              return true
            }
          }
          return false
        },
        handleDrop(_view, event) {
          const dt = (event as DragEvent).dataTransfer
          if (!dt) return false
          for (const file of Array.from(dt.files)) {
            if (file.type.startsWith('image/')) {
              event.preventDefault()
              void saveImage(file).then((id) => {
                document.execCommand('insertText', false, imageMarkdown(id, file.name))
              })
              return true
            }
          }
          return false
        },
      },
    })
  )
}

/**
 * Build (but do not call `.create()` on) the Milkdown Editor.
 * This is split out so React's useEditor can manage the lifecycle.
 */
export function buildMilkdownEditor(opts: MilkdownEditorOptions): Editor {
  const { root, defaultValue, onChange, saveImage } = opts

  const editor = Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, defaultValue)
      ctx.update(editorViewOptionsCtx, (prev) => ({
        ...prev,
        attributes: { 'aria-label': 'document', spellcheck: 'false' },
      }))
      // Register the markdown-updated listener
      ctx.get(listenerCtx).markdownUpdated((_ctx, md) => {
        onChange(md)
      })
    })
    .use(commonmark)
    .use(gfm)
    .use(history)
    .use(clipboard)
    .use(listener)

  if (saveImage) {
    editor.use(imagePastePlugin(saveImage))
  }

  return editor
}

/**
 * Create and fully initialize a Milkdown editor.
 * Returns the created Editor (after `.create()` resolves).
 */
export async function createMilkdownEditor(opts: MilkdownEditorOptions): Promise<Editor> {
  const editor = buildMilkdownEditor(opts)
  return editor.create()
}
