export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: TreeNode[]
}

interface RawNode {
  name: string
  type: 'file' | 'directory'
  children?: RawNode[]
}

/**
 * Turn the filesystem connector's `directory_tree` JSON (recursive, name-only) into TreeNodes with
 * a full `path` on every node (parent + '/' + name) — needed to open a file by path. Throws on
 * malformed JSON so the store can surface an error.
 */
export function parseDirectoryTree(rootPath: string, json: string): TreeNode[] {
  const raw = JSON.parse(json) as RawNode[]
  const build = (node: RawNode, parentPath: string): TreeNode => {
    const path = `${parentPath}/${node.name}`
    if (node.type === 'directory') {
      return { name: node.name, path, type: 'directory', children: (node.children ?? []).map((c) => build(c, path)) }
    }
    return { name: node.name, path, type: 'file' }
  }
  return raw.map((n) => build(n, rootPath))
}

/** Parse `list_allowed_directories` output into absolute root paths (drops a header / blank lines). */
export function parseAllowedDirs(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.endsWith(':'))
}
