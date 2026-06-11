import { describe, it, expect, vi } from 'vitest'
import { requestEnableMaps } from './enableMaps'
import { TripStore } from './tripStore'

let n = 0
const genId = () => `e-${++n}`

describe('requestEnableMaps', () => {
  it('asks the broker once and sets mapsEnabled on Allow', async () => {
    const store = new TripStore(genId)
    const t = store.createTrip('Paris')
    const broker = { request: vi.fn(async () => true) }
    const ok = await requestEnableMaps(store, broker, t)
    expect(ok).toBe(true)
    expect(store.getTrip(t)!.mapsEnabled).toBe(true)
    expect(broker.request).toHaveBeenCalledOnce()
    const firstCallArgs = (broker.request.mock.calls[0] as unknown as [unknown])[0]
    expect(firstCallArgs).toMatchObject({ kind: 'read', locality: 'NETWORK', resource: 'trip-maps' })
  })

  it('leaves maps disabled on Deny', async () => {
    const store = new TripStore(genId)
    const t = store.createTrip('Paris')
    const broker = { request: vi.fn(async () => false) }
    const ok = await requestEnableMaps(store, broker, t)
    expect(ok).toBe(false)
    expect(store.getTrip(t)!.mapsEnabled).toBe(false)
  })

  it('skips the prompt if maps are already enabled', async () => {
    const store = new TripStore(genId)
    const t = store.createTrip('Paris')
    store.setMapsEnabled(t, true)
    const broker = { request: vi.fn(async () => true) }
    expect(await requestEnableMaps(store, broker, t)).toBe(true)
    expect(broker.request).not.toHaveBeenCalled()
  })
})
