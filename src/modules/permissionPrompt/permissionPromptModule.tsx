import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { PermissionBroker } from '../../core/permissionBroker'

function PermissionPanel({ broker }: { broker: PermissionBroker }) {
  const { pending } = useStore(broker)
  if (pending.length === 0) {
    return <div style={{ padding: 8, fontSize: 11, color: '#999' }}>No pending requests.</div>
  }
  return (
    <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {pending.map((req) => (
        <div key={req.id} style={{ background: '#fff7e6', border: '1px solid #ffe2a8', borderRadius: 6, padding: 8, fontSize: 12 }}>
          <div style={{ marginBottom: 6 }}>
            <strong>{req.scope.locality}</strong> · <span>{req.detail}</span>
            {req.surfaceId && <span style={{ marginLeft: 6, fontSize: 10, color: '#888' }}>[{req.surfaceId}]</span>}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => broker.allow(req.id)}>Allow</button>
            <button onClick={() => broker.deny(req.id)}>Deny</button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function createPermissionPromptModule(broker: PermissionBroker): WorkspaceModule {
  return {
    id: 'permission-prompt',
    title: 'Permissions',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 20, collapsible: true, minSize: 10 },
    render: () => <PermissionPanel broker={broker} />,
    tools: [],
  }
}
