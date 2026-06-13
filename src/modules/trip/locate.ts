import type { BBox, GeoPlace } from '../../core/geo/types'
import { stopQuery, barePlace, pickBestMatch } from './placeQuery'

interface StopLike { name: string; place?: string }

/** Resolve a stop to coordinates (or null), scoped to the trip destination. */
export type StopLocate = (stop: StopLike, destination?: string) => Promise<GeoPlace | null>

/**
 * Resolve a stop to coordinates with a two-tier strategy:
 *  1. Nominatim geocode (primary) — handles addresses + well-known places.
 *  2. Overpass fallback — when the geocoder finds nothing, search raw OSM by fuzzy name within the
 *     destination's bounding box, recovering POIs whose spelling differs (e.g. "Leoda's Kitchen & Pie
 *     Shop" → OSM's "Leodas Kitchen and Pie Shop"). Best-effort: returns null rather than throwing.
 */
export function createStopLocator(deps: {
  geo: { geocode: (q: string) => Promise<GeoPlace[]> }
  overpass: { searchByName: (name: string, bbox: BBox) => Promise<GeoPlace[]> }
}) {
  const { geo, overpass } = deps

  const locate: StopLocate = async (stop, destination) => {
    const primary = (await geo.geocode(stopQuery(stop, destination)))[0]
    if (primary) return primary
    if (!destination) return null // no area to bound an Overpass search

    try {
      const bbox = (await geo.geocode(destination))[0]?.bbox
      if (!bbox) return null
      const candidates = await overpass.searchByName(barePlace(stop), bbox)
      return pickBestMatch(candidates, barePlace(stop)) ?? null
    } catch {
      return null // Overpass/area lookup failed — stay pin-less rather than crash the caller
    }
  }

  return { locate }
}
