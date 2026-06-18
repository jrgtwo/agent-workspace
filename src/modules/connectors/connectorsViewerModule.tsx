import type { WorkspaceModule } from '../../core/types'
import type { DocEditorStore } from '../docEditor/docEditorStore'
import { ProposalStore } from '../../core/proposalStore'
import { ProposalApplier } from '../../core/proposalApplier'
import type { ConnectorsSaveStore } from './connectorsSaveStore'
import { ConnectorsViewer } from './ConnectorsViewer'

/**
 * Read/edit pane for the Connectors feature, bound to a private scratch DocEditorStore that the
 * `open_in_viewer` tool fills. Reuses the document editor render with its own empty proposal store
 * (Notes edit-proposals never leak in). A Save bar writes the user's edits back to the source file.
 */
export function createConnectorsViewerModule(scratch: DocEditorStore, save: ConnectorsSaveStore): WorkspaceModule {
  const proposals = new ProposalStore(() => 'connectors-viewer-noop')
  const applier = new ProposalApplier(proposals)
  return {
    id: 'connectors-viewer',
    title: 'Viewer',
    locality: 'LOCAL',
    tools: [],
    layoutHints: { defaultSize: 34, collapsible: false, minSize: 20 },
    render: () => <ConnectorsViewer scratch={scratch} save={save} proposals={proposals} applier={applier} />,
  }
}
