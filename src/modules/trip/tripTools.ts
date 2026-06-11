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
        resolved.push({ name, lat: s.lat, lng: s.lng, time: s.time, note: s.note })
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
      'Build a COMPLETE new trip in ONE call: a title plus an ordered list of days, each with its own ' +
      'stops. Shown as a single pending change the user accepts. Use this to create an itinerary from ' +
      'scratch (e.g. "a 3-day Maui itinerary"). Research first with web_search if you need ideas, and ' +
      'include lat/lng from search_places when you have them so stops get map pins.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Trip title, e.g. "Maui Trip".' },
        days: {
          type: 'array',
          description: 'The days of the trip, in order.',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Day label, e.g. "Day 1".' },
              date: { type: 'string', description: 'Optional ISO date (YYYY-MM-DD).' },
              stops: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    lat: { type: 'number' },
                    lng: { type: 'number' },
                    time: { type: 'string', description: "Optional clock label like '09:00'." },
                    note: { type: 'string' },
                  },
                  required: ['name'],
                },
              },
            },
            required: ['label'],
          },
        },
      },
      required: ['title', 'days'],
    },
    handler: (a: { title?: string; days?: Array<{ label?: string; date?: string; stops?: StopInput[] }> }) => {
      const title = String(a?.title ?? '').trim()
      if (!title) return { ok: false, error: '`title` is required.' }
      const daysIn = Array.isArray(a?.days) ? a.days : []
      if (!daysIn.length) return { ok: false, error: '`days` must be a non-empty array.' }
      const days: ItineraryDayInput[] = daysIn.map((d, i) => ({
        label: String(d?.label ?? '').trim() || `Day ${i + 1}`,
        date: d?.date,
        stops: (Array.isArray(d?.stops) ? d.stops : [])
          .map((s) => ({ name: String(s?.name ?? '').trim(), lat: s?.lat, lng: s?.lng, time: s?.time, note: s?.note }))
          .filter((s) => s.name),
      }))
      const stopCount = days.reduce((n, d) => n + d.stops.length, 0)
      const payload: TripProposalPayload = { kind: 'build-itinerary', title, days }
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
