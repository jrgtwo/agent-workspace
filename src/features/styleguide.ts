import type { FeatureManifest } from '../core/types'
import { createStyleGuideModule } from '../modules/styleGuide/styleGuideModule'

export function createStyleGuideFeature(): FeatureManifest {
  const guide = createStyleGuideModule()
  return {
    id: 'styleguide', name: 'Style Guide', icon: '🎨',
    modules: [guide],
    layout: { type: 'panel', moduleId: 'style-guide' },
  }
}
