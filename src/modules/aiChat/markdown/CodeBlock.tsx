import { useState, type ReactNode } from 'react'
import { flattenText } from './flattenText'

function langOf(className?: string): string {
  const m = /language-([\w-]+)/.exec(className ?? '')
  return m ? m[1] : ''
}

export function CodeBlock({ className, children }: { className?: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false)
  const lang = langOf(className)
  const copy = () => {
    void navigator.clipboard.writeText(flattenText(children))
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <pre className="chat-code">
      {lang && <span className="chat-code__lang">{lang}</span>}
      <button type="button" className="chat-code__copy" onClick={copy}>
        {copied ? 'copied' : 'copy'}
      </button>
      <code className={className}>{children}</code>
    </pre>
  )
}
