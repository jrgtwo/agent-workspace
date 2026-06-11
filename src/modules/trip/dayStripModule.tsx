import { useState } from 'react'
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { TripStore } from './tripStore'
import './trip.css'

function AddStop({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState('')
  return (
    <form
      data-testid="add-stop-form"
      className="add-stop"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) { onAdd(name); setName('') }
      }}
    >
      <input placeholder="Add a stop…" value={name} onChange={(e) => setName(e.target.value)} />
    </form>
  )
}

function DayStrip({ store }: { store: TripStore }) {
  const { focusedDayId } = useStore(store)
  const trip = store.getActiveTrip()
  if (!trip) return <div className="day-strip">No trip selected.</div>
  return (
    <div className="day-strip">
      {trip.days.map((d) => (
        <div key={d.id} className="day-col" data-focused={d.id === focusedDayId}>
          <div className="day-col__head" onClick={() => store.focusDay(d.id)}>
            <span>{d.label}{d.date ? ` · ${d.date}` : ''}</span>
          </div>
          {d.stops.map((s) => (
            <div key={s.id} className="stop-row">
              {s.time && <span className="stop-row__time">{s.time}</span>}
              <span>{s.name}</span>
              <button className="stop-row__rm" aria-label={`Remove ${s.name}`}
                onClick={() => store.removeStop(trip.id, d.id, s.id)}>×</button>
            </div>
          ))}
          <AddStop onAdd={(name) => store.addStop(trip.id, d.id, { name })} />
        </div>
      ))}
      <button className="day-strip__add" onClick={() => store.addDay(trip.id)}>+ Day</button>
    </div>
  )
}

export function createDayStripModule(store: TripStore): WorkspaceModule {
  return {
    id: 'trip-day-strip',
    title: 'Itinerary',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 35, collapsible: false, minSize: 20 },
    render: () => <DayStrip store={store} />,
    tools: [],
  }
}
