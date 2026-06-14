import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { TripStore } from './tripStore'
import { requestEnableMaps, type BrokerLike } from './enableMaps'
import { routeLatLngs } from './routeLine'
import type { StopLocate } from './locate'
import type { GeoProvider, RouteGeometry } from '../../core/geo/types'
import './trip.css'

const numberedIcon = (n: number, selected: boolean, approximate = false) =>
  L.divIcon({
    className: `trip-pin${selected ? ' trip-pin--selected' : ''}${approximate ? ' trip-pin--approx' : ''}`,
    html: `<span>${n}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })

function TripMap({ store, broker, provider, locate }: { store: TripStore; broker: BrokerLike; provider: GeoProvider; locate: StopLocate }) {
  useStore(store) // re-render on trip/stop/focus/consent change
  const trip = store.getActiveTrip()
  const focusedDayId = store.getState().focusedDayId
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const geomRef = useRef<RouteGeometry | null>(null)

  const enabled = !!trip?.mapsEnabled
  const day = trip?.days.find((d) => d.id === focusedDayId)
  const located = (day?.stops ?? [])
    .map((s, i) => ({ ...s, n: i + 1 }))
    .filter((s) => typeof s.lat === 'number' && typeof s.lng === 'number')
  const selectedStopId = store.getState().selectedStopId

  useEffect(() => {
    if (!enabled || !elRef.current || mapRef.current) return
    const map = L.map(elRef.current).setView([20, 0], 2) // neutral world view; fitBounds centers on the trip once pins exist
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    // Pick-on-map: while a stop is awaiting placement, a map click sets its location.
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (store.getState().placingStopId) store.pickLocation(e.latlng.lat, e.latlng.lng)
    })
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null; layerRef.current = null }
  }, [enabled])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer || !mapRef.current) return
    let cancelled = false
    layer.clearLayers()
    if (!located.length) return
    for (const s of located) {
      const selected = s.id === selectedStopId
      const m = L.marker([s.lat!, s.lng!], { icon: numberedIcon(s.n, selected, s.approximate) })
        .bindTooltip(s.approximate ? `${s.n}. ${s.name} (approximate)` : `${s.n}. ${s.name}`)
        .addTo(layer)
      m.on('click', () => store.selectStop(s.id))
      if (selected) { m.openTooltip(); mapRef.current!.panTo([s.lat!, s.lng!]) }
    }
    // The route connects only PRECISE stops — approximate (centroid) pins aren't real waypoints.
    const routed = located.filter((s) => !s.approximate)
    const draw = (geom: RouteGeometry | null) => {
      if (cancelled || !layerRef.current) return
      const line = routeLatLngs(routed.map((s) => ({ lat: s.lat!, lng: s.lng! })), geom)
      L.polyline(line, { color: '#2b6cb0', weight: 3, dashArray: geom ? undefined : '6 5' }).addTo(layerRef.current)
    }
    if (routed.length >= 2 && enabled) {
      provider.route(routed.map((s) => ({ lat: s.lat!, lng: s.lng! })))
        .then((r) => { geomRef.current = r.geometry; draw(r.geometry) })
        .catch(() => draw(null)) // routing failed → straight dashed lines
    } else {
      draw(null)
    }
    mapRef.current.fitBounds(L.latLngBounds(located.map((s) => [s.lat!, s.lng!] as [number, number])).pad(0.2))
    return () => { cancelled = true }
    // `enabled` + `focusedDayId` are deps so markers/route repaint when the map is (re)created
    // after a maps off→on toggle — the located string alone is unchanged across a toggle.
  }, [enabled, focusedDayId, selectedStopId, located.map((s) => `${s.id}:${s.lat},${s.lng},${s.approximate}`).join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Agent-built itineraries arrive as stop names with no coordinates. When maps are on, geocode the
  // focused day's coordinate-less stops so they get pins and the map centers on the real place (e.g.
  // Maui) instead of the neutral default. Best-effort; a stop that can't be resolved stays pin-less.
  useEffect(() => {
    if (!enabled || !trip || !day) return
    const missing = day.stops.filter((s) => typeof s.lat !== 'number' || typeof s.lng !== 'number')
    if (!missing.length) return
    let cancelled = false
    // locate() does the Nominatim query (cleaned + place-hinted + destination-scoped) and, on a miss,
    // the Overpass fuzzy fallback within the destination bbox — so activity names and spelling variants resolve.
    void Promise.all(
      missing.map(async (s) => {
        try {
          const hit = await locate(s, trip.destination)
          if (!cancelled && hit) store.updateStop(trip.id, day.id, s.id, { lat: hit.lat, lng: hit.lng, placeName: hit.name })
        } catch { /* leave the stop pin-less */ }
      }),
    )
    return () => { cancelled = true }
    // dep on the missing-coords count: re-runs as geocodes land, stops once none remain (or all failed).
  }, [enabled, trip?.id, day?.id, day?.stops.filter((s) => typeof s.lat !== 'number' || typeof s.lng !== 'number').length]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!trip) return <div className="trip-map">No trip selected.</div>

  const placing = !!store.getState().placingStopId

  return (
    <div className="trip-map" data-placing={placing}>
      {enabled ? (
        <>
          <div ref={elRef} className="trip-map__leaflet" />
          {placing && (
            <div className="trip-map__placing-hint" role="status">
              Click the map to place this stop
              <button onClick={() => store.stopPlacing()}>Cancel</button>
            </div>
          )}
          <button className="trip-map__toggle" onClick={() => store.setMapsEnabled(trip.id, false)}>
            ◉ Maps online
          </button>
        </>
      ) : (
        <div className="trip-map__cta">
          <p>Maps are off for this trip. Enabling uses OpenStreetMap to draw the map, find places, and route between stops.</p>
          <button onClick={() => void requestEnableMaps(store, broker, trip.id)}>Enable online maps</button>
        </div>
      )}
    </div>
  )
}

export function createTripMapModule(store: TripStore, broker: BrokerLike, provider: GeoProvider, locate: StopLocate): WorkspaceModule {
  return {
    id: 'trip-map',
    title: 'Map',
    locality: 'NETWORK',
    layoutHints: { defaultSize: 65, collapsible: false, minSize: 30 },
    render: () => <TripMap store={store} broker={broker} provider={provider} locate={locate} />,
    tools: [],
  }
}
