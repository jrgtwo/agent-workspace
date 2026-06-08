import { useState } from 'react'

export function NewCardInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState('')
  const submit = () => {
    const t = title.trim()
    if (!t) return
    onAdd(t)
    setTitle('')
  }
  return (
    <form
      className="kanban-newcard"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <input
        className="kanban-newcard__input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="+ Add card"
        aria-label="New card title"
      />
    </form>
  )
}
