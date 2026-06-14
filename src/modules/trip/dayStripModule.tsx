import { useState } from 'react'
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { TripStore } from './tripStore'
import { PendingReview } from '../proposals/PendingReview'
import type { StopLocate } from './locate'
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

function DayStrip({ store, locate, review }: { store: TripStore; locate?: StopLocate; review?: ReviewDeps }) {
  const { focusedDayId, selectedStopId, placingStopId } = useStore(store)
  const [locStatus, setLocStatus] = useState<Record<string, 'busy' | 'miss'>>({})
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
    if (trip.mapsEnabled && locate) {
      try {
        const hit = await locate({ name }, trip.destination)
        if (hit) store.updateStop(trip.id, dayId, id, { lat: hit.lat, lng: hit.lng, placeName: hit.name, category: hit.category, approximate: hit.approximate })
      } catch { /* leave the stop pin-less; surfaced elsewhere */ }
    }
  }

  const handleLocate = async (dayId: string, stop: { id: string; name: string; place?: string }) => {
    if (!locate) return
    setLocStatus((m) => ({ ...m, [stop.id]: 'busy' }))
    try {
      const hit = await locate(stop, trip.destination)
      if (hit) {
        store.updateStop(trip.id, dayId, stop.id, { lat: hit.lat, lng: hit.lng, placeName: hit.name, category: hit.category, approximate: hit.approximate })
        setLocStatus((m) => { const n = { ...m }; delete n[stop.id]; return n }) // row now shows a pin
      } else {
        setLocStatus((m) => ({ ...m, [stop.id]: 'miss' })) // found nothing — say so, allow retry
      }
    } catch {
      setLocStatus((m) => ({ ...m, [stop.id]: 'miss' }))
    }
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
                  s.approximate ? (
                    <span
                      className="stop-row__loc stop-row__loc--approx"
                      aria-label={`Approximate location${trip.destination ? ` — near ${trip.destination}` : ''}: ${s.name}`}
                      title={`Approximate — near ${trip.destination ?? 'destination'}. Use 📌 to place it exactly.`}
                    >≈</span>
                  ) : (
                    <span className="stop-row__loc" aria-label={`On the map: ${s.placeName ?? s.name}`} title={s.placeName ?? 'On the map'}>📍</span>
                  )
                ) : (trip.mapsEnabled || !!locate) ? (
                  <button
                    className="stop-row__locate"
                    data-status={locStatus[s.id]}
                    disabled={locStatus[s.id] === 'busy'}
                    aria-label={locStatus[s.id] === 'miss' ? `Couldn't locate ${s.name} — retry` : `Locate ${s.name}`}
                    onClick={(e) => { e.stopPropagation(); void handleLocate(d.id, s) }}
                  >{locStatus[s.id] === 'busy' ? '…' : locStatus[s.id] === 'miss' ? 'Not found' : 'Locate'}</button>
                ) : (
                  <span className="stop-row__loc stop-row__loc--off" title="Off the map" aria-hidden="true">○</span>
                )}
                {(trip.mapsEnabled || !!locate) && (
                  <button
                    className="stop-row__pin"
                    data-active={placingStopId === s.id}
                    aria-label={placingStopId === s.id ? `Placing ${s.name} — click the map, or click to cancel` : `Set ${s.name} on the map`}
                    title={placingStopId === s.id ? 'Click the map to place this stop (or click to cancel)' : 'Set on map'}
                    onClick={(e) => { e.stopPropagation(); placingStopId === s.id ? store.stopPlacing() : store.startPlacing(s.id) }}
                  >📌</button>
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

export function createDayStripModule(store: TripStore, locate?: StopLocate, review?: ReviewDeps): WorkspaceModule {
  return {
    id: 'trip-day-strip',
    title: 'Itinerary',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 35, collapsible: false, minSize: 20 },
    render: () => <DayStrip store={store} locate={locate} review={review} />,
    tools: [],
  }
}
