import type { BBox, GeoPlace } from './types'
import { overpassNameRegex } from '../../modules/trip/placeQuery'

interface OverpassEl {
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

const DEFAULT_URL = '/overpass'

/**
 * Overpass searches RAW OSM data by tag + name (not Nominatim's geocoder index), so it recovers POIs whose
 * spelling differs ("Leoda's Kitchen & Pie Shop" vs OSM's "Leodas Kitchen and Pie Shop"). Used ONLY as a
 * fallback when the geocoder finds nothing — scoped to the destination bbox and rate-sensitive, so throttle it.
 */
export class OverpassProvider {
  private fetchImpl: typeof fetch
  private url: string

  constructor(opts?: { fetchImpl?: typeof fetch; url?: string }) {
    this.fetchImpl = opts?.fetchImpl ?? fetch
    this.url = opts?.url ?? DEFAULT_URL
  }

  async searchByName(name: string, bbox: BBox): Promise<GeoPlace[]> {
    const regex = overpassNameRegex(name)
    if (!regex) return [] // nothing distinctive to search for
    const ql =
      `[out:json][timeout:25];nwr["name"~"${regex}",i]` +
      `(${bbox.south},${bbox.west},${bbox.north},${bbox.east});out center 8;`
    const doFetch = this.fetchImpl // unbound: native fetch throws "Illegal invocation" as a method
    let res: Response
    try {
      res = await doFetch(this.url, { method: 'POST', body: new URLSearchParams({ data: ql }) })
    } catch {
      throw new Error("couldn't reach the place-search service — are you online?")
    }
    if (!res.ok) throw new Error(`place-search error (HTTP ${res.status}).`)
    const body = (await res.json()) as { elements?: OverpassEl[] }
    return (body.elements ?? [])
      .map((el): GeoPlace | null => {
        const lat = el.lat ?? el.center?.lat
        const lng = el.lon ?? el.center?.lon
        const name = el.tags?.name
        if (typeof lat !== 'number' || typeof lng !== 'number' || !name) return null
        const t = el.tags ?? {}
        return { name, lat, lng, category: t.amenity ?? t.shop ?? t.tourism ?? t.leisure }
      })
      .filter((p): p is GeoPlace => p !== null)
  }
}
