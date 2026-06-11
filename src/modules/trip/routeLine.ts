import type { RouteGeometry } from '../../core/geo/types'

/** The polyline to draw: OSRM geometry if we have it, else straight segments between pins. */
export function routeLatLngs(
  pins: { lat: number; lng: number }[],
  geometry: RouteGeometry | null,
): [number, number][] {
  if (geometry && geometry.coordinates.length) return geometry.coordinates.map(([lng, lat]) => [lat, lng])
  return pins.map((p) => [p.lat, p.lng])
}
