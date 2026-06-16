import { useState } from 'react'
import type { JSX } from 'react'
import { useStore } from '../../core/emitter'
import type { WorkspaceModule } from '../../core/types'
import type { EntityStore } from './entityStore'
import type { Entity } from './types'
import './graph.css'

function GraphLens({ store }: { store: EntityStore }): JSX.Element {
  const { entities } = useStore(store)
  const [view, setView] = useState<'list' | 'board'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = entities.find((e) => e.id === selectedId) ?? null

  return (
    <div className="graph" aria-label="graph">
      <div className="graph__bar">
        <div className="graph__views" role="tablist">
          <button type="button" role="tab" aria-selected={view === 'list'} className="graph__view-btn" onClick={() => setView('list')}>List</button>
          <button type="button" role="tab" aria-selected={view === 'board'} className="graph__view-btn" onClick={() => setView('board')}>Board</button>
        </div>
        <span className="graph__count">{entities.length} item{entities.length === 1 ? '' : 's'}</span>
      </div>
      <div className="graph__body">
        <div className="graph__main">
          {entities.length === 0 ? (
            <div className="graph__empty">No entities yet — ask the assistant to add some.</div>
          ) : view === 'list' ? (
            <ListView entities={entities} selectedId={selectedId} onSelect={setSelectedId} />
          ) : (
            <BoardView store={store} entities={entities} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </div>
        {selected && <Inspector store={store} entity={selected} all={entities} onSelect={setSelectedId} />}
      </div>
    </div>
  )
}

function ListView({ entities, selectedId, onSelect }: { entities: Entity[]; selectedId: string | null; onSelect: (id: string) => void }): JSX.Element {
  return (
    <ul className="graph__list">
      {entities.map((e) => (
        <li key={e.id}>
          <button type="button" className={`graph__row${e.id === selectedId ? ' graph__row--sel' : ''}`} onClick={() => onSelect(e.id)}>
            <span className="graph__title">{e.title}</span>
            <span className="graph__chip graph__chip--type">{e.type}</span>
            {e.status && <span className="graph__chip">{e.status}</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}

function BoardView({ store, entities, selectedId, onSelect }: { store: EntityStore; entities: Entity[]; selectedId: string | null; onSelect: (id: string) => void }): JSX.Element {
  const columns = store.statuses()
  const inColumn = (status: string) => entities.filter((e) => (e.status ?? '(none)') === status)
  return (
    <div className="graph__board">
      {columns.map((status) => (
        <div
          key={status}
          className="graph__col"
          onDragOver={(ev) => ev.preventDefault()}
          onDrop={(ev) => {
            const id = ev.dataTransfer.getData('text/graph-entity')
            if (id) store.setStatus(id, status === '(none)' ? '' : status)
          }}
        >
          <div className="graph__col-head">{status}</div>
          {inColumn(status).map((e) => (
            <button
              key={e.id}
              type="button"
              draggable
              onDragStart={(ev) => ev.dataTransfer.setData('text/graph-entity', e.id)}
              className={`graph__card${e.id === selectedId ? ' graph__card--sel' : ''}`}
              onClick={() => onSelect(e.id)}
            >
              <span className="graph__title">{e.title}</span>
              <span className="graph__chip graph__chip--type">{e.type}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

function Inspector({ store, entity, all, onSelect }: { store: EntityStore; entity: Entity; all: Entity[]; onSelect: (id: string) => void }): JSX.Element {
  const links = entity.links.map((id) => all.find((e) => e.id === id)).filter((e): e is Entity => !!e)
  const backlinks = store.backlinks(entity.id)
  const linkable = all.filter((e) => e.id !== entity.id && !entity.links.includes(e.id))
  return (
    <aside className="graph__inspector" aria-label="inspector">
      <div className="graph__insp-title">{entity.title}</div>
      <div className="graph__insp-meta">{entity.type}{entity.status ? ` · ${entity.status}` : ''}</div>
      {entity.body && <p className="graph__insp-body">{entity.body}</p>}
      <div className="graph__insp-section">
        <h4>Links</h4>
        {links.length === 0 ? <span className="graph__muted">None</span> : (
          <ul>
            {links.map((l) => (
              <li key={l.id}>
                <button type="button" className="graph__link" onClick={() => onSelect(l.id)}>{l.title}</button>
                <button type="button" className="graph__unlink" aria-label={`Unlink ${l.title}`} onClick={() => store.unlink(entity.id, l.id)}>✕</button>
              </li>
            ))}
          </ul>
        )}
        {linkable.length > 0 && (
          <select className="graph__add-link" value="" aria-label="Add link" onChange={(ev) => { if (ev.target.value) store.link(entity.id, ev.target.value) }}>
            <option value="">+ Link to…</option>
            {linkable.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        )}
      </div>
      <div className="graph__insp-section">
        <h4>Backlinks</h4>
        {backlinks.length === 0 ? <span className="graph__muted">None</span> : (
          <ul>
            {backlinks.map((b) => (
              <li key={b.id}><button type="button" className="graph__link" onClick={() => onSelect(b.id)}>{b.title}</button></li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

export function createGraphLensModule(store: EntityStore): WorkspaceModule {
  return {
    id: 'graph-lens',
    title: 'Graph',
    locality: 'LOCAL',
    tools: [],
    render: () => <GraphLens store={store} />,
  }
}
