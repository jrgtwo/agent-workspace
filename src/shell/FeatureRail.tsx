import './featureRail.css'
import type { FeatureManifest } from '../core/types'
import type { ViewDef } from '../modules/views/viewsStore'

export function FeatureRail({ features, views = [], activeId, onSelect, onNewView }: {
  features: FeatureManifest[]
  views?: ViewDef[]
  activeId: string
  onSelect: (id: string) => void
  onNewView?: () => void
}) {
  return (
    <div className="rail">
      <div className="rail__features">
        {features.map((f) => (
          <button key={f.id} title={f.name} onClick={() => onSelect(f.id)} className={`rail__btn${f.id === activeId ? ' rail__btn--active' : ''}`}>{f.icon}</button>
        ))}
      </div>
      {(views.length > 0 || onNewView) && (
        <div className="rail__views">
          {views.map((v) => (
            <button key={v.id} title={v.name} aria-label={v.name} onClick={() => onSelect(v.id)} className={`rail__btn${v.id === activeId ? ' rail__btn--active' : ''}`}>{v.icon}</button>
          ))}
          {onNewView && <button title="New view" aria-label="New view" className="rail__btn rail__btn--new" onClick={onNewView}>＋</button>}
        </div>
      )}
    </div>
  )
}
