import { describe, it, expect, vi } from 'vitest'
import { TripStore } from './tripStore'
import { ProposalStore } from '../../core/proposalStore'
import { createTripTools } from './tripTools'
import type { TripProposalPayload } from './types'

let n = 0
const genId = () => `tt-${++n}`

function tool(tools: ReturnType<typeof createTripTools>, name: string) {
  const t = tools.find((x) => x.name === name)!
  return t
}

describe('trip tools', () => {
  it('search_places refuses when maps are disabled, with an instructive error', async () => {
    const store = new TripStore(genId)
    store.createTrip('Paris')
    const proposals = new ProposalStore(genId)
    const geocode = vi.fn(async () => [{ name: 'Louvre', lat: 1, lng: 2 }])
    const tools = createTripTools({ store, proposals, geocode })
    const res = await tool(tools, 'search_places').handler({ query: 'museums' })
    expect((res as { ok: boolean }).ok).toBe(false)
    expect((res as { error: string }).error).toMatch(/enable online maps/i)
    expect(geocode).not.toHaveBeenCalled()
  })

  it('search_places returns places when maps are enabled', async () => {
    const store = new TripStore(genId)
    const t = store.createTrip('Paris')
    store.setMapsEnabled(t, true)
    const proposals = new ProposalStore(genId)
    const geocode = vi.fn(async () => [{ name: 'Louvre', lat: 48.86, lng: 2.33, category: 'tourism' }])
    const tools = createTripTools({ store, proposals, geocode })
    const res = await tool(tools, 'search_places').handler({ query: 'museums' }) as { ok: boolean; places: unknown[] }
    expect(res.ok).toBe(true)
    expect(res.places).toHaveLength(1)
  })

  it('propose_stops enqueues ONE proposal for the focused day and dedupes pending titles', async () => {
    const store = new TripStore(genId)
    const t = store.createTrip('Paris')
    const day = store.getTrip(t)!.days[0].id
    const proposals = new ProposalStore(genId)
    const tools = createTripTools({ store, proposals, geocode: vi.fn() })

    const res = await tool(tools, 'propose_stops').handler({
      stops: [{ name: 'Louvre', lat: 48.86, lng: 2.33 }, { name: 'Louvre' }],
    }) as { proposed: boolean; count: number }
    expect(res.proposed).toBe(true)
    expect(res.count).toBe(1) // duplicate 'Louvre' deduped within the batch
    const pending = proposals.forModule('trip')
    expect(pending).toHaveLength(1)
    const payload = pending[0].payload as TripProposalPayload
    expect(payload.kind).toBe('add-stops')
    if (payload.kind !== 'add-stops') throw new Error('expected add-stops')
    expect(payload.dayId).toBe(day)

    // proposing the same title again is skipped (already pending)
    const res2 = await tool(tools, 'propose_stops').handler({ stops: [{ name: 'Louvre' }] }) as { proposed: boolean }
    expect(res2.proposed).toBe(false)
    expect(proposals.forModule('trip')).toHaveLength(1)
  })

  it('create_itinerary groups a FLAT stop list into days and proposes ONE build-itinerary change', () => {
    const store = new TripStore(genId)
    const proposals = new ProposalStore(genId)
    const tools = createTripTools({ store, proposals, geocode: vi.fn() })
    const res = tool(tools, 'create_itinerary').handler({
      title: 'Maui',
      destination: 'Maui, Hawaii',
      stops: [
        { day: 'Day 1', name: 'Haleakalā' },
        { day: 'Day 1', name: 'Road to Hana' },
        { day: 'Day 2', name: 'Molokini' },
      ],
    }) as { proposed: boolean; days: number; stops: number }
    expect(res.proposed).toBe(true)
    expect(res.days).toBe(2)
    expect(res.stops).toBe(3)
    const pending = proposals.forModule('trip')
    expect(pending).toHaveLength(1)
    const payload = pending[0].payload as { kind: string; destination?: string; days: { label: string; stops: { name: string }[] }[] }
    expect(payload.kind).toBe('build-itinerary')
    expect(payload.destination).toBe('Maui, Hawaii')
    expect(payload.days.map((d) => d.label)).toEqual(['Day 1', 'Day 2'])
    expect(payload.days[0].stops.map((s) => s.name)).toEqual(['Haleakalā', 'Road to Hana'])
  })

  it('create_itinerary carries an agent-provided `place` hint onto the stop', () => {
    const store = new TripStore(genId)
    const proposals = new ProposalStore(genId)
    const tools = createTripTools({ store, proposals, geocode: vi.fn() })
    tool(tools, 'create_itinerary').handler({
      title: 'Kauai',
      destination: 'Kauai, Hawaii',
      stops: [{ day: 'Day 1', name: 'Dinner at Tidepools Restaurant', place: 'Tidepools Restaurant' }],
    })
    const payload = proposals.forModule('trip')[0].payload as TripProposalPayload
    if (payload.kind !== 'build-itinerary') throw new Error('expected build-itinerary')
    expect(payload.days[0].stops[0].place).toBe('Tidepools Restaurant')
  })

  it('propose_stops carries an agent-provided `place` hint onto the stop', async () => {
    const store = new TripStore(genId)
    store.createTrip('Kauai')
    const proposals = new ProposalStore(genId)
    const tools = createTripTools({ store, proposals, geocode: vi.fn() })
    await tool(tools, 'propose_stops').handler({
      stops: [{ name: 'Lunch at Merriman\'s', place: 'Merriman\'s Fish House' }],
    })
    const payload = proposals.forModule('trip')[0].payload as TripProposalPayload
    if (payload.kind !== 'add-stops') throw new Error('expected add-stops')
    expect(payload.stops[0].place).toBe('Merriman\'s Fish House')
  })
})
