import type { TripStore } from './tripStore'

/**
 * One-shot plain-text snapshot of the active trip, injected into the agent's system prompt each run
 * so it knows the trip, the focused day (where propose_stops lands), stop counts, and whether online
 * maps are enabled (search_places needs them) — instead of guessing.
 */
export function describeTripContext(store: TripStore): string {
  const trip = store.getActiveTrip()
  if (!trip) return 'Trip: no trip is selected. Ask the user to create or pick a trip.'
  const focusedId = store.getState().focusedDayId
  const lines = [
    `Trip: "${trip.title}" — online maps are ${trip.mapsEnabled ? 'ON (search_places works)' : 'OFF (search_places will refuse until the user enables maps)'}.`,
  ]
  for (const d of trip.days) {
    const focused = d.id === focusedId ? ' ← focused (propose_stops adds here)' : ''
    const stops = d.stops.map((s) => s.name).join(', ') || '(empty)'
    lines.push(`${d.label}${d.date ? ` (${d.date})` : ''}: ${stops}${focused}`)
  }
  return lines.join('\n')
}
