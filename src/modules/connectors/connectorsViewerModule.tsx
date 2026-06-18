import type { WorkspaceModule } from '../../core/types'
import type { DocEditorStore } from '../docEditor/docEditorStore'
import { DocEditorPanel } from '../docEditor/docEditorModule'
import { ProposalStore } from '../../core/proposalStore'
import { ProposalApplier } from '../../core/proposalApplier'

/**
 * Read/preview pane for the Connectors feature, bound to a private scratch DocEditorStore that the
 * `open_in_viewer` tool fills. It reuses the document editor render, but with its own empty
 * proposal store so Notes edit-proposals never leak in — and the connector agent has no edit tools
 * for this store, so no proposals arise (it behaves as a viewer you can also hand-edit).
 */
export function createConnectorsViewerModule(scratch: DocEditorStore): WorkspaceModule {
  const proposals = new ProposalStore(() => 'connectors-viewer-noop')
  const applier = new ProposalApplier(proposals)
  return {
    id: 'connectors-viewer',
    title: 'Viewer',
    locality: 'LOCAL',
    tools: [],
    layoutHints: { defaultSize: 34, collapsible: false, minSize: 20 },
    render: () => <DocEditorPanel store={scratch} proposals={proposals} applier={applier} />,
  }
}
