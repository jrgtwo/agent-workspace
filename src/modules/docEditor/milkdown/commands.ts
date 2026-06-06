/**
 * Milkdown command mappings for BlockKind and InlineKind.
 *
 * Usage (call AFTER editor.create() so command keys are registered):
 *   editor.action(runInline('strong'))
 *   editor.action(runBlock('heading'))
 */

import { callCommand } from '@milkdown/kit/utils'
import {
  toggleStrongCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleLinkCommand,
  wrapInHeadingCommand,
  wrapInBulletListCommand,
  wrapInBlockquoteCommand,
  createCodeBlockCommand,
  insertHrCommand,
} from '@milkdown/kit/preset/commonmark'
import { insertTableCommand } from '@milkdown/kit/preset/gfm'

export type BlockKind = 'heading' | 'todo' | 'code' | 'table' | 'quote' | 'divider'
export type InlineKind = 'strong' | 'em' | 'code' | 'link'

export type MenuPick =
  | { type: 'inline'; kind: InlineKind }
  | { type: 'block'; kind: BlockKind }

// The Ctx type from @milkdown/kit/ctx
type Ctx = Parameters<ReturnType<typeof callCommand>>[0]

/**
 * Returns a ctx action callback that toggles an inline mark.
 * Must be invoked (via editor.action) after the editor has been created,
 * as command keys are registered asynchronously during plugin setup.
 */
export function runInline(kind: InlineKind): (ctx: Ctx) => void {
  switch (kind) {
    case 'strong': return callCommand(toggleStrongCommand.key)
    case 'em':     return callCommand(toggleEmphasisCommand.key)
    case 'code':   return callCommand(toggleInlineCodeCommand.key)
    case 'link':   return callCommand(toggleLinkCommand.key)
  }
}

/**
 * Returns a ctx action callback that inserts/wraps a block.
 * 'todo' falls back to a bullet list since gfm task-list wrap is not exported
 * as a standalone command in this version of @milkdown/kit.
 */
export function runBlock(kind: BlockKind): (ctx: Ctx) => void {
  switch (kind) {
    case 'heading':  return callCommand(wrapInHeadingCommand.key, 2)
    case 'todo':     return callCommand(wrapInBulletListCommand.key)
    case 'code':     return callCommand(createCodeBlockCommand.key)
    case 'table':    return callCommand(insertTableCommand.key)
    case 'quote':    return callCommand(wrapInBlockquoteCommand.key)
    case 'divider':  return callCommand(insertHrCommand.key)
  }
}
