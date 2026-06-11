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
