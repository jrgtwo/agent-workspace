import type { PermissionRequest as Req, PermissionScope } from '../../core/types'

/** write or NETWORK access is high-severity → contextual popup; local read → inline card. */
export function isHighSeverity(scope: PermissionScope): boolean {
  return scope.kind === 'write' || scope.locality === 'NETWORK'
}

interface Props {
  req: Req
  onAllow: (id: string) => void
  onDeny: (id: string) => void
}

function Buttons({ req, onAllow, onDeny }: Props) {
  return (
    <div className="chat-perm__row">
      <button type="button" className="chat-perm__btn chat-perm__btn--allow" onClick={() => onAllow(req.id)}>Allow</button>
      <button type="button" className="chat-perm__btn" onClick={() => onDeny(req.id)}>Deny</button>
    </div>
  )
}

export function PermissionRequest(props: Props) {
  const { req } = props
  const high = isHighSeverity(req.scope)
  const head = (
    <>
      <div className="chat-perm__title"><span className="chat-perm__ic">⚠</span><b>PERMISSION · {req.scope.locality}</b></div>
      <div className="chat-perm__desc">{req.detail}</div>
    </>
  )
  if (high) {
    return (
      <div className="chat-perm__scrim" data-testid="perm-popup">
        <div className="chat-perm__popup">{head}<Buttons {...props} /></div>
      </div>
    )
  }
  return (
    <div className="chat-perm__inline" data-testid="perm-inline">{head}<Buttons {...props} /></div>
  )
}
