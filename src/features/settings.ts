import type { FeatureManifest } from '../core/types'
import { createThemeSettingsModule } from '../modules/settings/themeSettingsModule'
import { createMemoryViewerModule } from '../modules/memoryViewer/memoryViewerModule'
import { createDataSettingsModule } from '../modules/settings/dataSettingsModule'
import type { ThemeStore } from '../core/themeStore'
import type { MemoryStore } from '../core/memoryStore'

export function createSettingsFeature(deps: { theme: ThemeStore; memory: MemoryStore; clearAll: () => Promise<void> }): FeatureManifest {
  const appearance = createThemeSettingsModule(deps.theme)
  const memory = createMemoryViewerModule(deps.memory)
  const data = createDataSettingsModule(deps.clearAll)
  return {
    id: 'settings', name: 'Settings', icon: '⚙️',
    modules: [appearance, memory, data],
    // Appearance (theme picker) on top, Memory in the middle, Data (clear-all) at the bottom.
    layout: {
      type: 'split', direction: 'vertical', children: [
        { type: 'panel', moduleId: 'theme-settings', size: 40 },
        { type: 'panel', moduleId: 'memory-viewer', size: 40 },
        { type: 'panel', moduleId: 'data-settings', size: 20 },
      ],
    },
  }
}
