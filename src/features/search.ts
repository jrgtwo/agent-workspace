import type { FeatureManifest } from '../core/types'
import { createAiChatModule } from '../modules/aiChat/aiChatModule'
import { createSearchModule } from '../modules/search/searchModule'
import type { AgentEngine } from '../core/agentEngine'
import type { PermissionBroker } from '../core/permissionBroker'
import type { AgentAccentStore } from '../modules/aiChat/agentAccentStore'
import type { ResearchProvider } from '../core/research/types'
import type { SearchResultsStore } from '../modules/search/searchResultsStore'

export function createSearchFeature(deps: {
  engine: AgentEngine
  broker: PermissionBroker
  accent: AgentAccentStore
  provider: ResearchProvider
  results: SearchResultsStore
}): FeatureManifest {
  const chat = createAiChatModule(deps.engine, deps.broker, deps.accent)
  const search = createSearchModule(deps.provider, deps.results)
  return {
    id: 'search',
    name: 'Search',
    icon: '🔎',
    modules: [chat, search],
    // AI Chat | Results
    layout: {
      type: 'split',
      direction: 'horizontal',
      children: [
        { type: 'panel', moduleId: 'ai-chat', size: 45, draggable: true },
        { type: 'panel', moduleId: 'search-results', size: 55, draggable: true },
      ],
    },
  }
}
