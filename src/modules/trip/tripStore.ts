import { Emitter } from '../../core/emitter'
import type { Day, StopInput, Trip, TripState } from './types'

/**
 * TripStore — the itinerary's data brain. Holds trips → days → stops in immutable state and
 * mutates synchronously then `notify()`s. Persistence is layered on by `persistState`
 * (getState/subscribe/hydrate), so this store knows nothing about storage. Mirrors KanbanStore.
 */
export class TripStore extends Emitter<TripState> {
  private state: TripState = { trips: [], activeId: null, focusedDayId: null }
  private genId: () => string

  constructor(genId: () => string) {
    super()
    this.genId = genId
  }

  getState = (): TripState => this.state

  hydrate(state: TripState): void {
    this.state = {
      trips: state.trips ?? [],
      activeId: state.activeId ?? null,
      focusedDayId: state.focusedDayId ?? null,
    }
    this.notify()
  }

  // ---- selectors ----
  getTrip(id: string | null): Trip | undefined {
    return id ? this.state.trips.find((t) => t.id === id) : undefined
  }

  getActiveTrip(): Trip | undefined {
    return this.getTrip(this.state.activeId)
  }

  // ---- trips ----
  createTrip(title?: string): string {
    const id = this.genId()
    const day: Day = { id: this.genId(), label: 'Day 1', stops: [] }
    const trip: Trip = { id, title: title?.trim() || 'Untitled Trip', mapsEnabled: false, days: [day] }
    this.state = { trips: [...this.state.trips, trip], activeId: id, focusedDayId: day.id }
    this.notify()
    return id
  }

  switchTrip(id: string): void {
    const trip = this.getTrip(id)
    if (!trip) return
    this.state = { ...this.state, activeId: id, focusedDayId: trip.days[0]?.id ?? null }
    this.notify()
  }

  renameTrip(id: string, title: string): void {
    this.state = {
      ...this.state,
      trips: this.state.trips.map((t) => (t.id === id ? { ...t, title: title.trim() || t.title } : t)),
    }
    this.notify()
  }

  deleteTrip(id: string): void {
    const trips = this.state.trips.filter((t) => t.id !== id)
    const activeId = this.state.activeId === id ? (trips[0]?.id ?? null) : this.state.activeId
    const focusedDayId =
      this.state.activeId === id ? (trips[0]?.days[0]?.id ?? null) : this.state.focusedDayId
    this.state = { trips, activeId, focusedDayId }
    this.notify()
  }

  // ---- days ----
  addDay(tripId: string): string {
    const id = this.genId()
    this.updateTrip(tripId, (t) => ({
      ...t,
      days: [...t.days, { id, label: `Day ${t.days.length + 1}`, stops: [] }],
    }))
    return id
  }

  renameDay(tripId: string, dayId: string, patch: { label?: string; date?: string }): void {
    this.updateTrip(tripId, (t) => ({
      ...t,
      days: t.days.map((d) =>
        d.id === dayId
          ? { ...d, label: patch.label?.trim() || d.label, date: patch.date ?? d.date }
          : d,
      ),
    }))
  }

  removeDay(tripId: string, dayId: string): void {
    const trip = this.getTrip(tripId)
    if (!trip) return
    const days = trip.days.filter((d) => d.id !== dayId)
    this.updateTrip(tripId, (t) => ({ ...t, days }))
    if (this.state.focusedDayId === dayId) {
      this.state = { ...this.state, focusedDayId: days[0]?.id ?? null }
      this.notify()
    }
  }

  focusDay(dayId: string): void {
    this.state = { ...this.state, focusedDayId: dayId }
    this.notify()
  }

  // ---- stops ----
  private updateDay(tripId: string, dayId: string, fn: (d: Day) => Day): void {
    this.updateTrip(tripId, (t) => ({
      ...t,
      days: t.days.map((d) => (d.id === dayId ? fn(d) : d)),
    }))
  }

  addStop(tripId: string, dayId: string, input: StopInput): string {
    const id = this.genId()
    this.updateDay(tripId, dayId, (d) => ({
      ...d,
      stops: [...d.stops, { ...input, id, name: input.name.trim() || 'Untitled stop' }],
    }))
    return id
  }

  updateStop(tripId: string, dayId: string, stopId: string, patch: Partial<StopInput>): void {
    this.updateDay(tripId, dayId, (d) => ({
      ...d,
      stops: d.stops.map((s) => (s.id === stopId ? { ...s, ...patch } : s)),
    }))
  }

  removeStop(tripId: string, dayId: string, stopId: string): void {
    this.updateDay(tripId, dayId, (d) => ({ ...d, stops: d.stops.filter((s) => s.id !== stopId) }))
  }

  reorderStops(tripId: string, dayId: string, orderedIds: string[]): void {
    this.updateDay(tripId, dayId, (d) => {
      const byId = new Map(d.stops.map((s) => [s.id, s]))
      const reordered = orderedIds.map((id) => byId.get(id)).filter((s): s is NonNullable<typeof s> => !!s)
      // keep any ids not named in orderedIds, appended in their original order
      const named = new Set(orderedIds)
      const rest = d.stops.filter((s) => !named.has(s.id))
      return { ...d, stops: [...reordered, ...rest] }
    })
  }

  // ---- internal: immutably patch one trip ----
  protected updateTrip(tripId: string, fn: (t: Trip) => Trip): void {
    this.state = {
      ...this.state,
      trips: this.state.trips.map((t) => (t.id === tripId ? fn(t) : t)),
    }
    this.notify()
  }
}
