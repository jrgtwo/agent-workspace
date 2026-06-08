import { isValidElement, type ReactNode } from 'react'

/** Recursively reduce React children to their concatenated text content. */
export function flattenText(node: ReactNode): string {
  if (node == null || node === false || node === true) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(flattenText).join('')
  if (isValidElement(node)) {
    return flattenText((node.props as { children?: ReactNode }).children)
  }
  return ''
}
