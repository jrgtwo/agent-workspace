import './featureRail.css'
import type { FeatureManifest } from '../core/types'

export function FeatureRail({ features, activeId, onSelect }: {
  features: FeatureManifest[]
  activeId: string
  onSelect: (id: string) => void
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
    </div>
  )
}
