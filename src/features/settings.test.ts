import { describe, it, expect } from 'vitest'
import { createSettingsFeature } from './settings'
import { ThemeStore } from '../core/themeStore'
import { MemoryStore } from '../core/memoryStore'

describe('createSettingsFeature', () => {
  it('composes the appearance + memory + data modules in a vertical split', () => {
    const feature = createSettingsFeature({
      theme: new ThemeStore(),
      memory: new MemoryStore(() => 'id'),
      clearAll: async () => {},
    })
    expect(feature.id).toBe('settings')
    expect(feature.name).toBe('Settings')
    expect(feature.modules.map((m) => m.id)).toEqual(['theme-settings', 'memory-viewer', 'data-settings'])
    expect(feature.layout).toMatchObject({ type: 'split', direction: 'vertical' })
  })
})
