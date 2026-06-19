import type { WorkspaceModule } from '../../core/types'
import type { ConnectorsTreeStore } from './connectorsTreeStore'
import { ConnectorsTree } from './ConnectorsTree'

/**
 * File-tree pane for the Connectors feature: browses the connector's allowed directories and opens
 * a file in the viewer on click (human-driven, so it reads directly — no broker prompt).
 */
export function createConnectorsTreeModule(
  store: ConnectorsTreeStore,
  onOpenFile: (path: string) => void,
  onRefresh: () => void,
): WorkspaceModule {
  return {
    id: 'connectors-tree',
    title: 'Files',
    locality: 'LOCAL',
    tools: [],
    layoutHints: { defaultSize: 18, collapsible: true, minSize: 12 },
    render: () => <ConnectorsTree store={store} onOpenFile={onOpenFile} onRefresh={onRefresh} />,
  }
}
