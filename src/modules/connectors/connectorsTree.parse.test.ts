import { describe, it, expect } from 'vitest'
import { parseDirectoryTree, parseAllowedDirs } from './connectorsTreeParse'

describe('parseDirectoryTree', () => {
  it('builds nodes with full paths from the recursive name-only JSON', () => {
    const json = JSON.stringify([
      { name: 'README.md', type: 'file' },
      { name: 'src', type: 'directory', children: [
        { name: 'index.ts', type: 'file' },
        { name: 'lib', type: 'directory', children: [{ name: 'util.ts', type: 'file' }] },
      ] },
    ])

    const nodes = parseDirectoryTree('/root', json)

    expect(nodes).toEqual([
      { name: 'README.md', path: '/root/README.md', type: 'file' },
      {
        name: 'src', path: '/root/src', type: 'directory', children: [
          { name: 'index.ts', path: '/root/src/index.ts', type: 'file' },
          {
            name: 'lib', path: '/root/src/lib', type: 'directory', children: [
              { name: 'util.ts', path: '/root/src/lib/util.ts', type: 'file' },
            ],
          },
        ],
      },
    ])
  })

  it('returns an empty list for an empty directory', () => {
    expect(parseDirectoryTree('/root', '[]')).toEqual([])
  })

  it('throws on malformed JSON so the store can surface an error', () => {
    expect(() => parseDirectoryTree('/root', 'not json')).toThrow()
  })
})

describe('parseAllowedDirs', () => {
  it('extracts absolute paths, ignoring a header and blank lines', () => {
    const text = 'Allowed directories:\n/home/me/sandbox\n/home/me/docs\n\n'
    expect(parseAllowedDirs(text)).toEqual(['/home/me/sandbox', '/home/me/docs'])
  })

  it('handles a bare newline-separated list', () => {
    expect(parseAllowedDirs('/a\n/b')).toEqual(['/a', '/b'])
  })

  it('returns an empty list when there are no paths', () => {
    expect(parseAllowedDirs('Allowed directories:')).toEqual([])
  })
})
