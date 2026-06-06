import type { FeatureManifest } from '../core/types'

export function FeatureRail({ features, activeId, onSelect }: {
  features: FeatureManifest[]; activeId: string; onSelect: (id: string) => void
}) {
  return (
    <div style={{ width: 54, background: '#1b1f2b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0' }}>
      {features.map((f) => (
        <button
          key={f.id}
          title={f.name}
          onClick={() => onSelect(f.id)}
          style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 15, background: f.id === activeId ? '#5b6cff' : '#2a3042', color: f.id === activeId ? '#fff' : '#aab1c5' }}
        >
          {f.icon}
        </button>
      ))}
    </div>
  )
}
