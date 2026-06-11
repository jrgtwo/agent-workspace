export interface GeoPlace { name: string; lat: number; lng: number; category?: string }

/** A minimal GeoJSON LineString for a route's drawn path. */
export interface RouteGeometry { type: 'LineString'; coordinates: [number, number][] } // [lng, lat]

export interface RouteResult { distanceM: number; durationS: number; geometry: RouteGeometry }

/** Pluggable geocoding + routing. Default adapter is OSM (Nominatim + OSRM); others slot in later. */
export interface GeoProvider {
  id: string
  label: string
  geocode(query: string): Promise<GeoPlace[]>
  route(coords: { lat: number; lng: number }[]): Promise<RouteResult>
}
