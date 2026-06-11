import type { FeatureManifest } from '../core/types'
import { createDayStripModule } from '../modules/trip/dayStripModule'
import { createTripMapModule } from '../modules/trip/mapModule'
import { createAiChatModule } from '../modules/aiChat/aiChatModule'
import type { TripStore } from '../modules/trip/tripStore'
import type { AgentEngine } from '../core/agentEngine'
import type { PermissionBroker } from '../core/permissionBroker'
import type { AgentAccentStore } from '../modules/aiChat/agentAccentStore'
import type { GeoProvider } from '../core/geo/types'
import type { ProposalStore } from '../core/proposalStore'
import type { ProposalApplier } from '../core/proposalApplier'

export function createTripFeature(deps: {
  store: TripStore
  engine: AgentEngine
  broker: PermissionBroker
  accent: AgentAccentStore
  provider: GeoProvider
  proposals: ProposalStore
  applier: ProposalApplier
}): FeatureManifest {
  const map = createTripMapModule(deps.store, deps.broker, deps.provider)
  const dayStrip = createDayStripModule(
    deps.store,
    { geocode: (q) => deps.provider.geocode(q) },
    { proposals: deps.proposals, applier: deps.applier },
  )
  const chat = createAiChatModule(deps.engine, deps.broker, deps.accent)
  return {
    id: 'trip',
    name: 'Trip',
    icon: '🗺️',
    modules: [map, dayStrip, chat],
    // Layout C: (map over day strip) | chat
    layout: {
      type: 'split',
      direction: 'horizontal',
      children: [
        {
          type: 'split',
          direction: 'vertical',
          size: 70,
          children: [
            { type: 'panel', moduleId: 'trip-map', size: 65, draggable: true },
            { type: 'panel', moduleId: 'trip-day-strip', size: 35, draggable: true },
          ],
        },
        { type: 'panel', moduleId: 'ai-chat', size: 30, draggable: true },
      ],
    },
  }
}
