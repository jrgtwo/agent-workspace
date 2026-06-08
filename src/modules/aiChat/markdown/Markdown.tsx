import { memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { CodeBlock } from './CodeBlock'

// react-markdown calls `code` for BOTH inline and fenced code. Fenced code carries a
// `language-*` class (added by rehype-highlight); inline code does not.
const components: Components = {
  code({ className, children }) {
    if (/language-/.test(className ?? '')) {
      return <CodeBlock className={className}>{children}</CodeBlock>
    }
    return <code className="chat-icode">{children}</code>
  },
  // CodeBlock renders its own <pre>; prevent react-markdown's default <pre> wrapper from doubling.
  pre({ children }) {
    return <>{children}</>
  },
}

// Memoized on `children`: re-parsing markdown (remark + highlight + KaTeX) is expensive, so a
// parent re-render that doesn't change the message text (e.g. dragging the accent picker) skips it.
export const Markdown = memo(function Markdown({ children }: { children: string }) {
  return (
    <div className="chat-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
})
