import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TripStore } from './tripStore'
import { createDayStripModule } from './dayStripModule'

let n = 0
const genId = () => `g-${++n}`

describe('day-strip geocode-on-add', () => {
  it('locates a newly added stop and stores its coordinates', async () => {
    const store = new TripStore(genId)
    const t = store.createTrip('Paris')
    store.setMapsEnabled(t, true)
    const locate = vi.fn(async () => ({ name: 'Louvre', lat: 48.86, lng: 2.33 }))

    const mod = createDayStripModule(store, locate)
    render(<>{mod.render()}</>)
    fireEvent.change(screen.getByPlaceholderText('Add a stop…'), { target: { value: 'Louvre' } })
    fireEvent.submit(screen.getByTestId('add-stop-form'))

    await waitFor(() => {
      const stop = store.getTrip(t)!.days[0].stops[0]
      expect(stop.lat).toBe(48.86)
    })
    expect(locate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Louvre' }), undefined)
  })

  it('does NOT locate when maps are disabled', async () => {
    const store = new TripStore(genId)
    store.createTrip('Paris') // mapsEnabled defaults false
    const locate = vi.fn(async () => ({ name: 'Louvre', lat: 1, lng: 2 }))
    const mod = createDayStripModule(store, locate)
    render(<>{mod.render()}</>)
    fireEvent.change(screen.getByPlaceholderText('Add a stop…'), { target: { value: 'Louvre' } })
    fireEvent.submit(screen.getByTestId('add-stop-form'))
    await Promise.resolve()
    expect(locate).not.toHaveBeenCalled()
  })
})
