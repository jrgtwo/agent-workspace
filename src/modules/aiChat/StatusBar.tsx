interface Props {
  busy: boolean
  pendingCount: number
}

export function StatusBar({ busy, pendingCount }: Props) {
  const state =
    pendingCount > 0 ? `${pendingCount} waiting` : busy ? '● streaming' : 'READY'
  const cls =
    pendingCount > 0
      ? 'chat-status__chip--wait'
      : busy
        ? 'chat-status__chip--run'
        : 'chat-status__chip--ready'
  return (
    <div className="chat-status">
      <span className={`chat-status__chip ${cls}`}>{state}</span>
      <span className="chat-status__chip">local</span>
      <span className="chat-status__keys">
        <kbd>⏎</kbd> send <kbd>⇧⏎</kbd> newline <kbd>^C</kbd> stop
      </span>
    </div>
  )
}
