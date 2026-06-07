import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { PermissionBroker } from '../../core/permissionBroker'
import './permissionPrompt.css'

function PermissionPanel({ broker }: { broker: PermissionBroker }) {
  const { pending } = useStore(broker)
  if (pending.length === 0) {
    return <div className="perms__empty">No pending requests.</div>
  }
  return (
    <div className="perms">
      {pending.map((req) => (
        <div key={req.id} className="perms__card">
          <div className="perms__head">
            <strong>{req.scope.locality}</strong> · <span>{req.detail}</span>
            {req.surfaceId && <span className="perms__surface">[{req.surfaceId}]</span>}
          </div>
          <div className="perms__row">
            <button className="btn btn--accent" onClick={() => broker.allow(req.id)}>Allow</button>
            <button className="btn" onClick={() => broker.deny(req.id)}>Deny</button>
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
