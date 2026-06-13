import { describe, it, expect } from 'vitest'
import { cleanActivityPrefix, stopQuery, barePlace, overpassNameRegex, pickBestMatch } from './placeQuery'

describe('cleanActivityPrefix', () => {
  it('strips a leading meal-activity phrase so the place name resolves', () => {
    expect(cleanActivityPrefix('Dinner at Tidepools Restaurant')).toBe('Tidepools Restaurant')
    expect(cleanActivityPrefix('Lunch at Merriman\'s')).toBe('Merriman\'s')
    expect(cleanActivityPrefix('Coffee in Hanalei')).toBe('Hanalei')
  })

  it('strips a leading sightseeing verb + connector', () => {
    expect(cleanActivityPrefix('Visit the Louvre')).toBe('Louvre')
    expect(cleanActivityPrefix('Explore Waimea Canyon')).toBe('Waimea Canyon')
    expect(cleanActivityPrefix('Stop at Shipwreck Beach')).toBe('Shipwreck Beach')
  })

  it('leaves a bare place name untouched', () => {
    expect(cleanActivityPrefix('Shipwreck Beach')).toBe('Shipwreck Beach')
    expect(cleanActivityPrefix('Haleakalā National Park')).toBe('Haleakalā National Park')
  })

  it('does not strip when the activity word is part of the place (no connector)', () => {
    expect(cleanActivityPrefix('Dinner Island Bar')).toBe('Dinner Island Bar')
  })

  it('never strips to empty — keeps the original if nothing meaningful remains', () => {
    expect(cleanActivityPrefix('Dinner at')).toBe('Dinner at')
    expect(cleanActivityPrefix('Lunch')).toBe('Lunch')
  })
})

describe('stopQuery', () => {
  it('prefers the agent-provided clean place over the display name', () => {
    expect(stopQuery({ name: 'Dinner at Tidepools Restaurant', place: 'Tidepools Restaurant' }, 'Kauai, Hawaii'))
      .toBe('Tidepools Restaurant, Kauai, Hawaii')
  })

  it('cleans the display name when no place hint is given', () => {
    expect(stopQuery({ name: 'Dinner at Tidepools Restaurant' }, 'Kauai, Hawaii'))
      .toBe('Tidepools Restaurant, Kauai, Hawaii')
  })

  it('omits the destination when there is none', () => {
    expect(stopQuery({ name: 'Visit the Louvre' })).toBe('Louvre')
  })

  it('does not double-append a destination the base already contains', () => {
    expect(stopQuery({ name: 'Farewell dinner in Hanalei', place: 'Hanalei, Kauai, Hawaii' }, 'Kauai, Hawaii'))
      .toBe('Hanalei, Kauai, Hawaii')
  })
})

describe('barePlace', () => {
  it('is the agent place when present, else the cleaned name', () => {
    expect(barePlace({ name: 'Dinner at Tidepools Restaurant', place: 'Tidepools Restaurant' })).toBe('Tidepools Restaurant')
    expect(barePlace({ name: 'Visit the Louvre' })).toBe('Louvre')
  })
})

describe('overpassNameRegex (fuzzy POI match for Overpass)', () => {
  it('uses the first two significant words, joined loosely', () => {
    expect(overpassNameRegex("Leoda's Kitchen & Pie Shop")).toBe('leoda.?s.*kitchen')
    expect(overpassNameRegex('Morimoto Maui')).toBe('morimoto.*maui')
  })

  it('makes apostrophes/ʻokina optional so OSM spelling variants still match', () => {
    expect(overpassNameRegex("Haliʻimaile General Store")).toBe('hali.?imaile.*general')
  })

  it('drops leading articles and connectors as insignificant', () => {
    expect(overpassNameRegex('The Restaurant at Hotel Wailea')).toBe('restaurant.*hotel')
  })

  it('handles a single significant word', () => {
    expect(overpassNameRegex("Leoda's")).toBe('leoda.?s')
  })
})

describe('pickBestMatch', () => {
  const hits = [
    { name: 'Some Other Place', lat: 1, lng: 1 },
    { name: 'Leodas Kitchen and Pie Shop', lat: 2, lng: 2 },
  ]
  it('returns the hit sharing the most significant tokens with the target name', () => {
    expect(pickBestMatch(hits, "Leoda's Kitchen & Pie Shop")?.lat).toBe(2)
  })

  it('returns undefined when nothing meaningfully overlaps', () => {
    expect(pickBestMatch([{ name: 'Random Cafe', lat: 9, lng: 9 }], "Leoda's Kitchen")).toBeUndefined()
  })
})
