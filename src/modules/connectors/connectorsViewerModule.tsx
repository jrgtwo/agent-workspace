import type { WorkspaceModule } from '../../core/types'
import type { OpenDocsStore } from './openDocsStore'
import { ConnectorsViewer } from './ConnectorsViewer'

export function createConnectorsViewerModule(open: OpenDocsStore): WorkspaceModule {
  return {
    id: 'connectors-viewer',
    title: 'Viewer',
    locality: 'LOCAL',
    tools: [],
    layoutHints: { defaultSize: 34, collapsible: false, minSize: 20 },
    render: () => <ConnectorsViewer open={open} />,
  }
}
