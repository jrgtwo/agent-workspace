import './featureRail.css'
import type { FeatureManifest } from '../core/types'
import { THEMES, type ThemeId } from '../core/themeStore'

export function FeatureRail({ features, activeId, onSelect, activeTheme, onTheme }: {
  features: FeatureManifest[]
  activeId: string
  onSelect: (id: string) => void
  activeTheme: ThemeId
  onTheme: (id: ThemeId) => void
}) {
  return (
    <div className="rail">
      <div className="rail__features">
        {features.map((f) => (
          <button
            key={f.id}
            title={f.name}
            onClick={() => onSelect(f.id)}
            className={`rail__btn${f.id === activeId ? ' rail__btn--active' : ''}`}
          >
            {f.icon}
          </button>
        ))}
      </div>
      <div className="rail__themes">
        <span className="rail__themes-label">THEME</span>
        {THEMES.map((t) => (
          <button
            key={t.id}
            title={t.label}
            aria-label={t.label}
            aria-pressed={t.id === activeTheme}
            onClick={() => onTheme(t.id)}
            className={`rail__theme-btn${t.id === activeTheme ? ' rail__theme-btn--active' : ''}`}
          >
            {t.label.split(' ').map((w) => w[0]).join('')}
          </button>
        ))}
      </div>
    </div>
  )
}
