// src/modules/connectors/ConnectorsViewer.tsx
import { useStore } from '../../core/emitter'
import { DocEditorPanel } from '../docEditor/docEditorModule'
import { ProposalStore } from '../../core/proposalStore'
import { ProposalApplier } from '../../core/proposalApplier'
import type { OpenDocsStore } from './openDocsStore'
import './connectors.css'

const proposals = new ProposalStore(() => 'connectors-viewer-noop')
const applier = new ProposalApplier(proposals)

export function ConnectorsViewer({ open }: { open: OpenDocsStore }) {
  const { tabs, activePath } = useStore(open)
  const active = open.activeDoc()
  return (
    <div className="connectors-viewer">
      <div className="connectors-viewer__tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.path}
            type="button"
            role="tab"
            aria-selected={t.path === activePath}
            className={`connectors-tab${t.path === activePath ? ' connectors-tab--active' : ''}`}
            onClick={() => open.activate(t.path)}
          >
            {t.name}{t.dirty ? ' •' : ''}
            <span
              className="connectors-tab__close"
              aria-label={`close ${t.name}`}
              onClick={(e) => {
                e.stopPropagation()
                if (t.dirty && !window.confirm('Discard unsaved changes?')) return
                open.close(t.path)
              }}
            >✕</span>
          </button>
        ))}
        {tabs.length === 0 && <span className="connectors-viewer__empty">No file open</span>}
      </div>
      {active && (
        <div className="connectors-viewer__body">
          <SaveBar open={open} />
          <DocEditorPanel store={active.doc} proposals={proposals} applier={applier} />
        </div>
      )}
    </div>
  )
}

function SaveBar({ open }: { open: OpenDocsStore }) {
  const active = open.activeDoc()!
  const { dirty, status, error } = useStore(active.save)
  const hint = status === 'saving' ? 'Saving…' : status === 'error' ? `Save failed: ${error ?? ''}` : dirty ? 'Unsaved changes' : status === 'saved' ? 'Saved' : ''
  return (
    <div className="connectors-viewer__bar">
      <span className="connectors-viewer__status" data-status={status}>{hint}</span>
      <button type="button" className="connectors-viewer__save" disabled={!dirty || status === 'saving'} onClick={() => void active.save.save()}>Save</button>
    </div>
  )
}
