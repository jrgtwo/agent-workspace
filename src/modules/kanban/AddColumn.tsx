import { useState } from 'react'

export function AddColumn({ onAdd }: { onAdd: (name: string) => void }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const submit = () => {
    const n = name.trim()
    if (n) onAdd(n)
    setName('')
    setAdding(false)
  }

  if (!adding) {
    return (
      <button className="kanban-addcol" onClick={() => setAdding(true)}>
        + Add column
      </button>
    )
  }
  return (
    <form
      className="kanban-addcol kanban-addcol--editing"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <input
        className="kanban-input"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={submit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setName('')
            setAdding(false)
          }
        }}
        placeholder="Column name"
        aria-label="New column name"
      />
    </form>
  )
}
