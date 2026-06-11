import type { GeoPlace, GeoProvider, RouteGeometry, RouteResult } from './types'

interface NominatimItem { display_name?: string; lat?: string; lon?: string; class?: string }

const NOMINATIM = 'https://nominatim.openstreetmap.org'
const OSRM = 'https://router.project-osrm.org'

/** OSM-backed geocoding (Nominatim) + routing (OSRM, added later). */
export class OsmGeoProvider implements GeoProvider {
  readonly id = 'osm'
  readonly label = 'OpenStreetMap'
  private fetchImpl: typeof fetch
  private nominatimUrl: string
  private osrmUrl: string

  constructor(opts?: { fetchImpl?: typeof fetch; nominatimUrl?: string; osrmUrl?: string }) {
    this.fetchImpl = opts?.fetchImpl ?? fetch
    this.nominatimUrl = (opts?.nominatimUrl ?? NOMINATIM).replace(/\/$/, '')
    this.osrmUrl = (opts?.osrmUrl ?? OSRM).replace(/\/$/, '')
  }

  async geocode(query: string): Promise<GeoPlace[]> {
    const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '5' })
    const url = `${this.nominatimUrl}/search?${params.toString()}`
    // Note: browsers can't set a User-Agent/Referer, so the public Nominatim endpoint may rate-limit
    // anonymous traffic — the GeoRegistry seam lets a self-hosted provider replace this later.
    const doFetch = this.fetchImpl // unbound: native fetch throws "Illegal invocation" as a method
    let res: Response
    try {
      res = await doFetch(url, { headers: { Accept: 'application/json' } })
    } catch {
      throw new Error("couldn't reach the map provider — are you online?")
    }
    if (!res.ok) throw new Error(`map provider error (HTTP ${res.status}).`)
    const items = (await res.json()) as NominatimItem[]
    return (Array.isArray(items) ? items : [])
      .filter((i) => i.lat && i.lon)
      .map((i) => ({
        name: i.display_name ?? query,
        lat: Number(i.lat),
        lng: Number(i.lon),
        category: i.class,
      }))
  }

  async route(coords: { lat: number; lng: number }[]): Promise<RouteResult> {
    if (coords.length < 2) throw new Error('need at least two stops to route.')
    const path = coords.map((c) => `${c.lng},${c.lat}`).join(';')
    const url = `${this.osrmUrl}/route/v1/walking/${path}?overview=full&geometries=geojson`
    const doFetch = this.fetchImpl
    let res: Response
    try {
      res = await doFetch(url)
    } catch {
      throw new Error("couldn't reach the routing service — are you online?")
    }
    if (!res.ok) throw new Error(`routing error (HTTP ${res.status}).`)
    const body = (await res.json()) as { routes?: { distance: number; duration: number; geometry: RouteGeometry }[] }
    const route = body.routes?.[0]
    if (!route) throw new Error('no route found between these stops.')
    return { distanceM: route.distance, durationS: route.duration, geometry: route.geometry }
  }
}
