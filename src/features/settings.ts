import type { FeatureManifest } from '../core/types'
import { createThemeSettingsModule } from '../modules/settings/themeSettingsModule'
import { createMemoryViewerModule } from '../modules/memoryViewer/memoryViewerModule'
import type { ThemeStore } from '../core/themeStore'
import type { MemoryStore } from '../core/memoryStore'

export function createSettingsFeature(deps: { theme: ThemeStore; memory: MemoryStore }): FeatureManifest {
  const appearance = createThemeSettingsModule(deps.theme)
  const memory = createMemoryViewerModule(deps.memory)
  return {
    id: 'settings', name: 'Settings', icon: '⚙️',
    modules: [appearance, memory],
    // Appearance (theme picker) on top, Memory below.
    layout: {
      type: 'split', direction: 'vertical', children: [
        { type: 'panel', moduleId: 'theme-settings', size: 45 },
        { type: 'panel', moduleId: 'memory-viewer', size: 55 },
      ],
    },
  }
}
