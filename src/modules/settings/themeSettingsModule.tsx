import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import { THEMES, type ThemeStore } from '../../core/themeStore'
import './themeSettings.css'

function ThemePicker({ store }: { store: ThemeStore }) {
  const { theme } = useStore(store)
  return (
    <div className="theme-settings">
      {THEMES.map((t) => {
        const active = t.id === theme
        return (
          <button
            key={t.id}
            type="button"
            data-theme={t.id}
            aria-label={t.label}
            aria-pressed={active}
            onClick={() => store.setTheme(t.id)}
            className={`theme-card${active ? ' theme-card--active' : ''}`}
          >
            <span className="theme-card__preview">
              <span className="theme-card__swatch theme-card__swatch--accent" />
              <span className="theme-card__swatch theme-card__swatch--surface" />
              <span className="theme-card__aa">Aa</span>
            </span>
            <span className="theme-card__name">{t.label}</span>
            {active && <span className="theme-card__check" aria-hidden="true">✓</span>}
          </button>
        )
      })}
    </div>
  )
}

export function createThemeSettingsModule(store: ThemeStore): WorkspaceModule {
  return {
    id: 'theme-settings',
    title: 'Appearance',
    locality: 'LOCAL',
    layoutHints: { defaultSize: 45, minSize: 20 },
    render: () => <ThemePicker store={store} />,
    tools: [],
  }
}
