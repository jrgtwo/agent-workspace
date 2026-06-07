import type { ReactNode } from 'react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'

const processor = unified().use(remarkParse).use(remarkGfm)

// mdast nodes are loosely typed here on purpose (internal renderer).
/* eslint-disable @typescript-eslint/no-explicit-any */
function renderNodes(nodes: any[]): ReactNode[] {
  return nodes.map((n, i) => <RenderNode key={i} node={n} />)
}

function RenderNode({ node: n }: { node: any }): ReactNode {
  switch (n.type) {
    case 'paragraph': return <p>{renderNodes(n.children)}</p>
    case 'heading': {
      const Tag = `h${n.depth}` as 'h1'
      return <Tag>{renderNodes(n.children)}</Tag>
    }
    case 'text': return n.value
    case 'strong': return <strong>{renderNodes(n.children)}</strong>
    case 'emphasis': return <em>{renderNodes(n.children)}</em>
    case 'delete': return <del>{renderNodes(n.children)}</del>
    case 'inlineCode': return <code>{n.value}</code>
    case 'code': return <pre><code>{n.value}</code></pre>
    case 'link': return <a href={n.url}>{renderNodes(n.children)}</a>
    case 'list': return n.ordered ? <ol>{renderNodes(n.children)}</ol> : <ul>{renderNodes(n.children)}</ul>
    case 'listItem': return <li>{renderNodes(n.children)}</li>
    case 'blockquote': return <blockquote>{renderNodes(n.children)}</blockquote>
    case 'image': return <img src={n.url} alt={n.alt ?? ''} />
    case 'table': {
      const [head, ...rows] = (n.children ?? []) as any[]
      return (
        <table>
          {head && (
            <thead><tr>{(head.children as any[]).map((c, k) => <th key={k}>{renderNodes(c.children)}</th>)}</tr></thead>
          )}
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>{(r.children as any[]).map((c, k) => <td key={k}>{renderNodes(c.children)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      )
    }
    case 'thematicBreak': return <hr />
    case 'break': return <br />
    default: return n.children ? <>{renderNodes(n.children)}</> : (n.value ?? null)
  }
}

/** Render a markdown source string as block-level React (paragraphs, headings, lists, …). */
export function MarkdownBlock({ source }: { source: string }) {
  const tree = processor.parse(source) as { children?: unknown[] }
  return <>{renderNodes((tree.children ?? []) as any[])}</>
}

/** Render markdown as inline React, unwrapping a single surrounding paragraph. */
export function MarkdownInline({ source }: { source: string }) {
  const tree = processor.parse(source) as { children?: any[] }
  const first = tree.children?.[0]
  const kids = first && first.type === 'paragraph' ? first.children : (tree.children ?? [])
  return <>{renderNodes(kids as any[])}</>
}
