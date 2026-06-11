import type { PermissionScope } from '../../core/types'
import type { TripStore } from './tripStore'

/** Minimal slice of PermissionBroker this helper needs (real PermissionBroker is assignable to it). */
export interface BrokerLike {
  request(scope: PermissionScope, args?: unknown, surfaceId?: string): Promise<boolean>
}

/**
 * Ask once for online-maps consent for a trip. On Allow, persist it on the trip so tiles/geocode/
 * route flow freely afterwards (no prompt per pan). Revoke via TripStore.setMapsEnabled(id, false).
 */
export async function requestEnableMaps(store: TripStore, broker: BrokerLike, tripId: string): Promise<boolean> {
  const trip = store.getTrip(tripId)
  if (!trip) return false
  if (trip.mapsEnabled) return true
  const scope: PermissionScope = {
    kind: 'read',
    resource: 'trip-maps',
    locality: 'NETWORK',
    describe: () => `Enable online maps for "${trip.title}"? Map tiles, place lookups, and routing will use OpenStreetMap services until you turn this off.`,
  }
  const ok = await broker.request(scope, undefined, 'trip-chat')
  if (ok) store.setMapsEnabled(tripId, true)
  return ok
}
