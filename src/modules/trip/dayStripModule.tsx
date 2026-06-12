import { useState } from 'react'
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { TripStore } from './tripStore'
import { PendingReview } from '../proposals/PendingReview'
import type { ProposalStore } from '../../core/proposalStore'
import type { ProposalApplier } from '../../core/proposalApplier'
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

interface Geocoder { geocode: (q: string) => Promise<{ name: string; lat: number; lng: number; category?: string }[]> }
interface ReviewDeps { proposals: ProposalStore; applier: ProposalApplier }

function TripHeader({ store }: { store: TripStore }) {
  const { trips } = useStore(store)
  const trip = store.getActiveTrip()
  return (
    <div className="trip-header">
      {trip && (
        <input
          key={trip.id}
          className="trip-header__name"
          aria-label="Trip name"
          defaultValue={trip.title}
          onBlur={(e) => store.renameTrip(trip.id, e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        />
      )}
      {trips.length > 1 && trip && (
        <select aria-label="Switch trip" value={trip.id} onChange={(e) => store.switchTrip(e.target.value)}>
          {trips.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      )}
      <button className="trip-header__new" onClick={() => store.createTrip('New Trip')}>+ New trip</button>
      {trips.length > 1 && trip && (
        <button className="trip-header__del" aria-label="Delete trip" onClick={() => store.deleteTrip(trip.id)}>🗑</button>
      )}
    </div>
  )
}

function DayStrip({ store, geo, review }: { store: TripStore; geo?: Geocoder; review?: ReviewDeps }) {
  const { focusedDayId, selectedStopId } = useStore(store)
  const trip = store.getActiveTrip()
  if (!trip) {
    return (
      <div className="trip-itinerary">
        <TripHeader store={store} />
        <div className="day-strip">No trip yet — click &quot;+ New trip&quot;.</div>
      </div>
    )
  }

  const addStop = async (dayId: string, name: string) => {
    const id = store.addStop(trip.id, dayId, { name })
    if (trip.mapsEnabled && geo) {
      try {
        const hit = (await geo.geocode(trip.destination ? `${name}, ${trip.destination}` : name))[0]
        if (hit) store.updateStop(trip.id, dayId, id, { lat: hit.lat, lng: hit.lng, placeName: hit.name, category: hit.category })
      } catch { /* leave the stop pin-less; surfaced elsewhere */ }
    }
  }

  const locate = async (dayId: string, stop: { id: string; name: string }) => {
    if (!geo) return
    try {
      const hit = (await geo.geocode(trip.destination ? `${stop.name}, ${trip.destination}` : stop.name))[0]
      if (hit) store.updateStop(trip.id, dayId, stop.id, { lat: hit.lat, lng: hit.lng, placeName: hit.name, category: hit.category })
    } catch { /* leave pin-less */ }
  }

  return (
    <div className="trip-itinerary">
      <TripHeader store={store} />
      {review && <PendingReview proposals={review.proposals} applier={review.applier} moduleId="trip" />}
      <div className="day-strip">
        {trip.days.map((d) => (
          <div key={d.id} className="day-col" data-focused={d.id === focusedDayId}>
            <div className="day-col__head" onClick={() => store.focusDay(d.id)}>
              <span>{d.label}{d.date ? ` · ${d.date}` : ''}</span>
            </div>
            {d.stops.map((s, i) => (
              <div
                key={s.id}
                className="stop-row"
                data-selected={s.id === selectedStopId}
                onClick={() => { store.selectStop(s.id); store.focusDay(d.id) }}
              >
                <span className="stop-row__num">{i + 1}</span>
                {s.time && <span className="stop-row__time">{s.time}</span>}
                <span className="stop-row__name">{s.name}</span>
                {typeof s.lat === 'number' && typeof s.lng === 'number' ? (
                  <span className="stop-row__loc" aria-label={`On the map: ${s.placeName ?? s.name}`} title={s.placeName ?? 'On the map'}>📍</span>
                ) : (trip.mapsEnabled || !!geo) ? (
                  <button
                    className="stop-row__locate"
                    aria-label={`Locate ${s.name}`}
                    onClick={(e) => { e.stopPropagation(); void locate(d.id, s) }}
                  >Locate</button>
                ) : (
                  <span className="stop-row__loc stop-row__loc--off" title="Off the map" aria-hidden="true">○</span>
                )}
                <button
                  className="stop-row__rm"
                  aria-label={`Remove ${s.name}`}
                  onClick={(e) => { e.stopPropagation(); store.removeStop(trip.id, d.id, s.id) }}
                >×</button>
              </div>
            ))}
            <AddStop onAdd={(name) => void addStop(d.id, name)} />
          </div>
        ))}
        <button className="day-strip__add" onClick={() => store.addDay(trip.id)}>+ Day</button>
      </div>
    </div>
  )
}

export function createDayStripModule(store: TripStore, geo?: Geocoder, review?: ReviewDeps): WorkspaceModule {
  return {
    id: 'trip-day-strip',
    title: 'Itinerary',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 35, collapsible: false, minSize: 20 },
    render: () => <DayStrip store={store} geo={geo} review={review} />,
    tools: [],
  }
}
