import { describe, it, expect, vi } from 'vitest'
import { createSearchFeature } from './search'
import { AgentEngine } from '../core/agentEngine'
import { Registry } from '../core/registry'
import { PermissionBroker } from '../core/permissionBroker'
import { AgentAccentStore } from '../modules/aiChat/agentAccentStore'
import { SearchResultsStore } from '../modules/search/searchResultsStore'
import type { ResearchProvider } from '../core/research/types'

describe('createSearchFeature', () => {
  it('composes a chat + results layout and exposes the web_search tool', () => {
    const engine = new AgentEngine({ chat: vi.fn() } as any, new Registry(), new PermissionBroker(() => 'p'), 'search-chat')
    const provider: ResearchProvider = { id: 'searxng', label: 's', search: async () => [] }
    const feature = createSearchFeature({ engine, broker: new PermissionBroker(() => 'p'), accent: new AgentAccentStore(), provider, results: new SearchResultsStore() })
    expect(feature.id).toBe('search')
    expect(feature.modules.map((m) => m.id)).toEqual(['ai-chat', 'search-results'])
    const searchMod = feature.modules.find((m) => m.id === 'search-results')!
    expect(searchMod.tools.map((t) => t.name)).toContain('web_search')
    const cols = (feature.layout as { children: { moduleId: string }[] }).children.map((c) => c.moduleId)
    expect(cols).toEqual(['ai-chat', 'search-results'])
  })
})
