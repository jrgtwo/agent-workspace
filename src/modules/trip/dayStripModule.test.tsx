import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TripStore } from './tripStore'
import { createDayStripModule } from './dayStripModule'

let n = 0
const genId = () => `u-${++n}`

describe('day-strip module', () => {
  it('renders days and stops of the active trip and adds a stop', () => {
    const store = new TripStore(genId)
    const trip = store.createTrip('Paris')
    const day = store.getTrip(trip)!.days[0].id
    store.addStop(trip, day, { name: 'Louvre' })

    const mod = createDayStripModule(store)
    render(<>{mod.render()}</>)

    expect(screen.getByText('Day 1')).toBeInTheDocument()
    expect(screen.getByText('Louvre')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Add a stop…'), { target: { value: 'Musée d’Orsay' } })
    fireEvent.submit(screen.getByTestId('add-stop-form'))
    expect(store.getTrip(trip)!.days[0].stops.map((s) => s.name)).toContain('Musée d’Orsay')
  })
})

describe('day-list correlation', () => {
  it('shows a number badge per stop and a located indicator vs a Locate button', () => {
    let n = 0
    const store = new TripStore(() => `c-${++n}`)
    const t = store.createTrip('Kauai')
    store.setMapsEnabled(t, true)
    const day = store.getTrip(t)!.days[0].id
    const s1 = store.addStop(t, day, { name: 'Waimea Canyon' })
    store.updateStop(t, day, s1, { lat: 21.9, lng: -159.6, placeName: 'Waimea Canyon, HI' })
    store.addStop(t, day, { name: 'Dinner downtown' }) // no coords

    const mod = createDayStripModule(store)
    render(<>{mod.render()}</>)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    // located stop has a 📍; unlocated has a Locate button
    expect(screen.getByLabelText('On the map: Waimea Canyon, HI')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /locate Dinner downtown/i })).toBeInTheDocument()
  })

  it('clicking a stop row selects it and focuses its day', () => {
    let n = 0
    const store = new TripStore(() => `c2-${++n}`)
    const t = store.createTrip('Kauai')
    const day = store.getTrip(t)!.days[0].id
    const s1 = store.addStop(t, day, { name: 'Waimea Canyon' })
    const mod = createDayStripModule(store)
    render(<>{mod.render()}</>)
    fireEvent.click(screen.getByText('Waimea Canyon'))
    expect(store.getState().selectedStopId).toBe(s1)
    expect(store.getState().focusedDayId).toBe(day)
  })

  it('Locate geocodes the stop (scoped to destination) and stores coords + placeName', async () => {
    let n = 0
    const store = new TripStore(() => `c3-${++n}`)
    const t = store.createTrip('Kauai')
    store.setMapsEnabled(t, true)
    // give the trip a destination via a build proposal so geocode is scoped
    store.applyProposal({ kind: 'build-itinerary', title: 'Kauai', destination: 'Kauai, Hawaii', days: [{ label: 'Day 1', stops: [{ name: 'Shipwreck Beach' }] }] })
    const active = store.getActiveTrip()!
    void active.days[0].id // day id available for debugging
    const geocode = vi.fn(async () => [{ name: 'Shipwreck Beach, Kōloa, HI', lat: 21.87, lng: -159.43 }])
    const mod = createDayStripModule(store, { geocode })
    render(<>{mod.render()}</>)
    fireEvent.click(screen.getByRole('button', { name: /locate Shipwreck Beach/i }))
    await waitFor(() => expect(store.getActiveTrip()!.days[0].stops[0].lat).toBe(21.87))
    expect(store.getActiveTrip()!.days[0].stops[0].placeName).toBe('Shipwreck Beach, Kōloa, HI')
    expect(geocode).toHaveBeenCalledWith('Shipwreck Beach, Kauai, Hawaii')
  })
})

describe('trip header (multi-trip)', () => {
  it('renames the active trip on blur', () => {
    let n = 0
    const store = new TripStore(() => `h-${++n}`)
    const a = store.createTrip('Paris')
    const mod = createDayStripModule(store)
    render(<>{mod.render()}</>)
    const name = screen.getByLabelText('Trip name')
    fireEvent.change(name, { target: { value: 'Paris Trip' } })
    fireEvent.blur(name)
    expect(store.getTrip(a)!.title).toBe('Paris Trip')
  })

  it('creates a new trip and makes it active', () => {
    let n = 0
    const store = new TripStore(() => `h2-${++n}`)
    store.createTrip('Paris')
    const mod = createDayStripModule(store)
    render(<>{mod.render()}</>)
    fireEvent.click(screen.getByText('+ New trip'))
    expect(store.getState().trips).toHaveLength(2)
    expect(store.getActiveTrip()!.title).toBe('New Trip')
  })

  it('switches the active trip via the selector when more than one exists', () => {
    let n = 0
    const store = new TripStore(() => `h3-${++n}`)
    const a = store.createTrip('Paris')
    const b = store.createTrip('Rome')
    expect(store.getState().activeId).toBe(b)
    const mod = createDayStripModule(store)
    render(<>{mod.render()}</>)
    fireEvent.change(screen.getByLabelText('Switch trip'), { target: { value: a } })
    expect(store.getState().activeId).toBe(a)
  })
})
