import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
