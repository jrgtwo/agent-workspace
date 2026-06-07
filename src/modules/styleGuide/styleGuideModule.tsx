import './styleGuide.css'
// Ensure the reused component-scoped classes are bundled even if those panels
// haven't rendered yet, so the gallery is self-sufficient.
import '../../shell/panelArea.css'
import '../docEditor/docEditorReview.css'
import type { WorkspaceModule } from '../../core/types'

const COLOR_TOKENS = [
  'bg', 'surface', 'surface-2', 'surface-3', 'border', 'border-strong',
  'text', 'text-strong', 'text-muted',
  'accent', 'accent-strong', 'accent-soft',
  'success', 'danger', 'warning', 'info',
  'diff-add-fg', 'diff-del-fg',
  'syntax-keyword', 'syntax-fn', 'syntax-string',
]

function GuidePanel() {
  return (
    <div className="guide">
      <h2>Design language</h2>

      <h3>Color tokens</h3>
      <div className="guide__swatches">
        {COLOR_TOKENS.map((t) => (
          <div key={t} className="guide__swatch">
            <div className="guide__chip" style={{ background: `var(--${t})` }} />
            <span>--{t}</span>
          </div>
        ))}
      </div>

      <h3>Type scale</h3>
      <div className="guide__type">
        <div style={{ fontSize: 'var(--text-xl)', color: 'var(--text-strong)' }}>Heading XL</div>
        <div style={{ fontSize: 'var(--text-lg)', color: 'var(--text-strong)' }}>Heading LG</div>
        <div style={{ fontSize: 'var(--text-base)' }}>Body base — the quick brown fox.</div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Small / secondary text.</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-sm)' }}>mono — const x = 1</div>
      </div>

      <h3>Components</h3>
      <div className="guide__row">
        <button className="btn">Button</button>
        <button className="btn btn--accent">Accent</button>
        <button className="btn" disabled>Disabled</button>
        <span className="locality locality--local">LOCAL</span>
        <span className="locality locality--network">NETWORK</span>
      </div>
      <div className="guide__row">
        <span className="diff-del">removed</span>
        <span className="diff-add">added</span>
      </div>
    </div>
  )
}

export function createStyleGuideModule(): WorkspaceModule {
  return {
    id: 'style-guide',
    title: 'Style Guide',
    locality: 'LOCAL',
    render: () => <GuidePanel />,
    tools: [],
  }
}
