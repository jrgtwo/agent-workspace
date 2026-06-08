import { useEffect, useRef, useState } from 'react'

/** Warm + cool presets to start from (warm ones sit clear of the warning amber). */
const PRESETS = ['#d98f4e', '#e0a3c4', '#b79ce0', '#e0c060', '#7fb0e0', '#79c2cf', '#c19ad0']

interface Props {
  /** Current override color, or null when using the theme default. */
  color: string | null
  /** A hex sets the override; null resets to the theme default. */
  onChange: (hex: string | null) => void
}

/**
 * The agent message label, made interactive: clicking it opens a popover with a color
 * wheel + preset swatches + reset, which live-update the agent-card accent.
 */
export function AgentAccentPicker({ color, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span className="chat-msg__label chat-accent" ref={ref}>
      <button
        type="button"
        className="chat-accent__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="chat-msg__sig">▌</span> agent
      </button>
      {open && (
        <div className="chat-accent__pop" role="dialog" aria-label="Agent accent">
          <input
            type="color"
            className="chat-accent__wheel"
            aria-label="Agent color"
            value={color ?? '#79c2cf'}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="chat-accent__swatches">
            {PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                className="chat-accent__swatch"
                style={{ background: c }}
                aria-label={`Set ${c}`}
                onClick={() => onChange(c)}
              />
            ))}
          </div>
          <button type="button" className="chat-accent__reset" onClick={() => onChange(null)}>
            Reset to default
          </button>
        </div>
      )}
    </span>
  )
}
