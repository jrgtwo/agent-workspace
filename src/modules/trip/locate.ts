import type { BBox, GeoPlace } from '../../core/geo/types'
import { stopQuery, barePlace, pickBestMatch } from './placeQuery'

interface StopLike { name: string; place?: string }

/** A resolved location — `approximate` means it's a destination-centroid guess, not a real match. */
export type LocatedPlace = GeoPlace & { approximate?: boolean }

/** Resolve a stop to coordinates (or null), scoped to the trip destination. */
export type StopLocate = (stop: StopLike, destination?: string) => Promise<LocatedPlace | null>

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
    if (!destination) return null // no area to bound a fallback search or centre on

    try {
      const area = (await geo.geocode(destination))[0]
      if (!area) return null // can't even place the destination — stay pin-less

      // Tier 2: Overpass fuzzy POI search within the destination bbox.
      if (area.bbox) {
        try {
          const best = pickBestMatch(await overpass.searchByName(barePlace(stop), area.bbox), barePlace(stop))
          if (best) return best
        } catch { /* Overpass failed — fall through to the centroid */ }
      }

      // Tier 3: nothing real found — pin near the destination centre, flagged approximate.
      return { name: `Near ${destination}`, lat: area.lat, lng: area.lng, approximate: true }
    } catch {
      return null
    }
  }

  return { locate }
}
