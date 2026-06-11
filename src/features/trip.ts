import type { FeatureManifest } from '../core/types'
import { createDayStripModule } from '../modules/trip/dayStripModule'
import { createAiChatModule } from '../modules/aiChat/aiChatModule'
import type { TripStore } from '../modules/trip/tripStore'
import type { AgentEngine } from '../core/agentEngine'
import type { PermissionBroker } from '../core/permissionBroker'
import type { AgentAccentStore } from '../modules/aiChat/agentAccentStore'

export function createTripFeature(deps: {
  store: TripStore
  engine: AgentEngine
  broker: PermissionBroker
  accent: AgentAccentStore
}): FeatureManifest {
  const dayStrip = createDayStripModule(deps.store)
  const chat = createAiChatModule(deps.engine, deps.broker, deps.accent)
  return {
    id: 'trip',
    name: 'Trip',
    icon: '🗺️',
    modules: [dayStrip, chat],
    // Milestone 1: Itinerary | AI Chat. A later task nests a map above the day strip.
    layout: {
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'panel', moduleId: 'trip-day-strip', size: 68, draggable: true },
        { type: 'panel', moduleId: 'ai-chat', size: 32, draggable: true },
      ],
    },
  }
}
