import type { ToolDef } from '../../core/types'
import type { TripStore } from './tripStore'
import type { ProposalStore } from '../../core/proposalStore'
import type { GeoPlace } from '../../core/geo/types'
import type { ItineraryDayInput, StopInput, TripProposalPayload } from './types'

const MODULE_ID = 'trip'
const NO_TRIP = { ok: false as const, error: 'No trip is open. Ask the user to select or create a trip.' }
const MAPS_OFF = {
  ok: false as const,
  error: 'Online maps are not enabled for this trip, so place lookups are unavailable. Ask the user to click "Enable online maps" first, then try again.',
}

export function createTripTools(deps: {
  store: TripStore
  proposals: ProposalStore
  geocode: (q: string) => Promise<GeoPlace[]>
}): ToolDef[] {
  const { store, proposals, geocode } = deps

  const searchPlaces: ToolDef = {
    name: 'search_places',
    description:
      'Find real places (by name or description, e.g. "art museums in Paris") to add to the itinerary. ' +
      'Returns candidates with coordinates. Only works once the user has enabled online maps for the trip.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'What to search for.' } },
      required: ['query'],
    },
    handler: async (a: { query?: string }) => {
      const trip = store.getActiveTrip()
      if (!trip) return NO_TRIP
      if (!trip.mapsEnabled) return MAPS_OFF
      const query = String(a?.query ?? '').trim()
      if (!query) return { ok: false, error: '`query` is required.' }
      try {
        const places = await geocode(query)
        return { ok: true, places: places.map((p) => ({ name: p.name, lat: p.lat, lng: p.lng, category: p.category })) }
      } catch (e) {
        return { ok: false, error: (e as Error).message }
      }
    },
  }

  const proposeStops: ToolDef = {
    name: 'propose_stops',
    description:
      'Propose adding one or MORE stops to the currently-focused day in a SINGLE call (shown as one ' +
      'pending change the user accepts or rejects). Gather ALL the stops and call this ONCE — do not ' +
      'call it repeatedly. Include lat/lng from search_places when you have them so the stop gets a map pin.',
    parameters: {
      type: 'object',
      properties: {
        stops: {
          type: 'array',
          description: 'The stops to add — pass the full list in one call.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              place: { type: 'string', description: 'The bare geocodable place to pin, e.g. "Tidepools Restaurant" — NOT the activity ("Dinner at Tidepools Restaurant"). Use the town/area if there is no specific venue.' },
              lat: { type: 'number' },
              lng: { type: 'number' },
              time: { type: 'string', description: "Optional clock label like '09:00'." },
              note: { type: 'string' },
            },
            required: ['name'],
          },
        },
      },
      required: ['stops'],
    },
    handler: (a: { stops?: Array<StopInput> }) => {
      const trip = store.getActiveTrip()
      if (!trip) return NO_TRIP
      const dayId = store.getState().focusedDayId ?? trip.days[0]?.id
      const day = trip.days.find((d) => d.id === dayId)
      if (!day) return { ok: false, error: 'This trip has no day to add stops to.' }
      const list = Array.isArray(a?.stops) ? a.stops : []
      if (!list.length) return { ok: false, error: '`stops` must be a non-empty array.' }

      // Titles already pending for THIS module+day (loop guard, pending-only — like create_cards).
      const pending = new Set(
        proposals.forModule(MODULE_ID)
          .flatMap((c) => {
            const p = c.payload as TripProposalPayload
            return p.kind === 'add-stops' && p.dayId === day.id ? p.stops : []
          })
          .map((s) => s.name.trim().toLowerCase()),
      )

      const resolved: StopInput[] = []
      const seen = new Set<string>()
      const skipped: string[] = []
      for (const s of list) {
        const name = String(s?.name ?? '').trim()
        if (!name) { skipped.push('(blank)'); continue }
        const key = name.toLowerCase()
        if (seen.has(key) || pending.has(key)) {
          skipped.push(`"${name}" (already ${seen.has(key) ? 'in this batch' : 'pending'})`)
          continue
        }
        seen.add(key)
        resolved.push({ name, place: s.place, lat: s.lat, lng: s.lng, time: s.time, note: s.note })
      }

      if (!resolved.length) {
        return { ok: true, proposed: false, skipped, message: `No stops to add — all ${list.length} were duplicates or blank.` }
      }
      const payload: TripProposalPayload = { kind: 'add-stops', tripId: trip.id, dayId: day.id, stops: resolved }
      proposals.propose({
        moduleId: MODULE_ID,
        summary: `Add ${resolved.length} stop${resolved.length === 1 ? '' : 's'} to ${day.label}: ${resolved.map((s) => s.name).join(', ')}`,
        payload,
      })
      return {
        proposed: true,
        count: resolved.length,
        ...(skipped.length ? { skipped } : {}),
        message: `Proposed ${resolved.length} stop${resolved.length === 1 ? '' : 's'}; awaiting your review.`,
      }
    },
  }

  const createItinerary: ToolDef = {
    name: 'create_itinerary',
    description:
      'Build a COMPLETE new trip in ONE call. Pass a title and a SINGLE FLAT list of stops, where each ' +
      'stop names the day it belongs to (e.g. "Day 1"). Stops are grouped into days in the order their ' +
      'day labels first appear. Use this to create an itinerary from scratch (e.g. "a 3-day Maui ' +
      'itinerary") — research first with web_search if you need ideas, then call this ONCE. You do NOT ' +
      'need coordinates; the map looks up each stop\'s location by name. ALWAYS pass `destination` (the ' +
      'region, e.g. "Kauai, Hawaii") so stops are located accurately and not confused with same-named ' +
      'places elsewhere. Shown as one pending change the user accepts.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Trip title, e.g. "Maui Trip".' },
        destination: { type: 'string', description: 'The region/place the whole trip is in, e.g. "Kauai, Hawaii" or "Maui". Used to locate stops on the map — ALWAYS provide it.' },
        stops: {
          type: 'array',
          description: 'A flat list of EVERY stop across the whole trip. Tag each with its day.',
          items: {
            type: 'object',
            properties: {
              day: { type: 'string', description: 'Which day this stop is on, e.g. "Day 1" or "Day 2".' },
              name: { type: 'string', description: 'The place or activity, e.g. "Haleakalā National Park" or "Dinner at Tidepools Restaurant".' },
              place: { type: 'string', description: 'The bare geocodable place to pin, e.g. "Tidepools Restaurant" — NOT the activity. Use the town/area if there is no specific venue. Helps the map find activity-named stops.' },
              time: { type: 'string', description: "Optional clock label like '09:00'." },
              note: { type: 'string', description: 'Optional short note.' },
            },
            required: ['day', 'name'],
          },
        },
      },
      required: ['title', 'stops'],
    },
    handler: (a: { title?: string; destination?: string; stops?: Array<{ day?: string; name?: string; place?: string; time?: string; note?: string }> }) => {
      const title = String(a?.title ?? '').trim()
      if (!title) return { ok: false, error: '`title` is required.' }
      const destination = String(a?.destination ?? '').trim() || undefined
      const list = Array.isArray(a?.stops) ? a.stops : []
      if (!list.length) return { ok: false, error: '`stops` must be a non-empty flat array; tag each stop with a `day`.' }
      // Group the flat stop list into days, preserving the order day labels first appear.
      const order: string[] = []
      const byDay = new Map<string, StopInput[]>()
      for (const s of list) {
        const name = String(s?.name ?? '').trim()
        if (!name) continue
        const dayLabel = String(s?.day ?? '').trim() || 'Day 1'
        if (!byDay.has(dayLabel)) { byDay.set(dayLabel, []); order.push(dayLabel) }
        byDay.get(dayLabel)!.push({ name, place: s?.place, time: s?.time, note: s?.note })
      }
      const days: ItineraryDayInput[] = order.map((label) => ({ label, stops: byDay.get(label)! }))
      if (!days.length) return { ok: false, error: 'No valid stops — each stop needs a `name`.' }
      const stopCount = days.reduce((n, d) => n + d.stops.length, 0)
      const payload: TripProposalPayload = { kind: 'build-itinerary', title, destination, days }
      proposals.propose({
        moduleId: MODULE_ID,
        summary: `Create itinerary "${title}": ${days.length} day${days.length === 1 ? '' : 's'}, ${stopCount} stop${stopCount === 1 ? '' : 's'}`,
        payload,
      })
      return { proposed: true, days: days.length, stops: stopCount, message: `Proposed a new "${title}" itinerary (${days.length} days, ${stopCount} stops); awaiting your review.` }
    },
  }

  return [searchPlaces, proposeStops, createItinerary]
}
