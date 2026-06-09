import type { ReactNode } from 'react'
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { PreviewStore } from './previewStore'
import './orchestrator.css'

export type PreviewRenderers = Record<string, () => ReactNode>

function PreviewPanel({ store, renderers }: { store: PreviewStore; renderers: PreviewRenderers }) {
  const { focusedFeature } = useStore(store)
  const render = focusedFeature ? renderers[focusedFeature] : undefined
  return (
    <div className="preview">
      <div className="preview__head">
        <span className="preview__title">Live preview</span>
        {focusedFeature && <span className="plan__tag">{focusedFeature}</span>}
      </div>
      <div className="preview__body">
        {render ? render() : <p className="plan__empty">Nothing to preview yet — delegated work appears here as it happens.</p>}
      </div>
    </div>
  )
}

export function createPreviewModule(store: PreviewStore, renderers: PreviewRenderers): WorkspaceModule {
  return {
    id: 'orchestrator-preview',
    title: 'Preview',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 25, collapsible: true, minSize: 15 },
    render: () => <PreviewPanel store={store} renderers={renderers} />,
    tools: [],
  }
}
