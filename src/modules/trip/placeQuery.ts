// Turn an itinerary stop's display name into a geocodable query. Itinerary items are often phrased as
// ACTIVITIES ("Dinner at Tidepools Restaurant") and Nominatim matches near-literally, so the leading
// framing makes an otherwise-findable place return nothing. We strip that framing (A) and prefer an
// agent-supplied clean `place` when present (B).

// Meal nouns only strip when a connector follows, so a real place like "Dinner Island Bar" is left alone.
const MEAL = /^(?:breakfast|brunch|lunch|dinner|supper|coffee|drinks?|snacks?|meals?|dining)\s+(?:at|in|near|by|on|around)\s+/i
// Sightseeing verbs strip with an OPTIONAL connector: "Explore Waimea Canyon", "Visit the Louvre".
const VERB = /^(?:visit|explore|tour|see|stop|shop(?:ping)?|walk|stroll|wander|relax|check\s?out|go|head|grab|enjoy)\s+(?:(?:at|in|to|on|around|near|by|the|through|some)\s+)?/i

/** Strip a leading activity phrase ("Dinner at", "Visit the") so the bare place name remains. */
export function cleanActivityPrefix(name: string): string {
  const stripped = name.replace(MEAL, '').replace(VERB, '').trim()
  return stripped.length ? stripped : name // never strip to nothing
}

/** Build the geocoder query for a stop: agent `place` hint wins, else clean the name; scope to destination. */
export function stopQuery(stop: { name: string; place?: string }, destination?: string): string {
  const base = (stop.place?.trim() || cleanActivityPrefix(stop.name)).trim()
  if (!destination) return base
  if (base.toLowerCase().includes(destination.toLowerCase())) return base
  return `${base}, ${destination}`
}
