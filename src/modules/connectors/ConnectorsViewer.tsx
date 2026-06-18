import { useEffect } from 'react'
import { useStore } from '../../core/emitter'
import type { DocEditorStore } from '../docEditor/docEditorStore'
import { DocEditorPanel } from '../docEditor/docEditorModule'
import type { ProposalStore } from '../../core/proposalStore'
import type { ProposalApplier } from '../../core/proposalApplier'
import type { ConnectorsSaveStore, SaveStatus } from './connectorsSaveStore'
import './connectors.css'

function statusHint(dirty: boolean, status: SaveStatus, error?: string): string {
  if (status === 'saving') return 'Saving…'
  if (status === 'error') return error ? `Save failed: ${error}` : 'Save failed'
  if (dirty) return 'Unsaved changes'
  if (status === 'saved') return 'Saved'
  return ''
}

export function ConnectorsViewer({ scratch, save, proposals, applier }: {
  scratch: DocEditorStore
  save: ConnectorsSaveStore
  proposals: ProposalStore
  applier: ProposalApplier
}) {
  const { name, sourcePath } = useStore(scratch)
  const { dirty, status, error } = useStore(save)
  // After a file opens, the Milkdown editor lightly normalizes markdown (bullets, trailing newline),
  // which would otherwise show as spurious unsaved changes. Re-baseline once the load settles.
  useEffect(() => {
    if (!sourcePath) return
    const id = setTimeout(() => save.rebaseline(), 50)
    return () => clearTimeout(id)
  }, [sourcePath, save])
  const onClose = () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return
    scratch.hydrate({ name: 'No file open', text: '' })
  }
  return (
    <div className="connectors-viewer">
      <div className="connectors-viewer__bar">
        <span className="connectors-viewer__name" title={sourcePath ?? ''}>{name}</span>
        <span className="connectors-viewer__status" data-status={status}>{statusHint(dirty, status, error)}</span>
        <button
          type="button"
          className="connectors-viewer__save"
          disabled={!dirty || status === 'saving'}
          onClick={() => void save.save()}
        >
          Save
        </button>
        {sourcePath && (
          <button type="button" className="connectors-viewer__close" aria-label="Close file" onClick={onClose}>✕</button>
        )}
      </div>
      <div className="connectors-viewer__body">
        <DocEditorPanel store={scratch} proposals={proposals} applier={applier} />
      </div>
    </div>
  )
}
