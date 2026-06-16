import type { EntityStore } from './entityStore'

/** Compact live snapshot of the graph for the agent's system prompt (cf. describeKanbanContext). */
export function describeGraphContext(store: EntityStore): string {
  const entities = store.getState().entities
  if (entities.length === 0) {
    return 'The graph is currently EMPTY (no entities yet). Use create_entities to add some.'
  }
  const byStatus = store.statuses().map((s) => {
    const items = entities.filter((e) => (e.status ?? '(none)') === s)
    return `  ${s}: ${items.map((e) => `"${e.title}"`).join(', ')}`
  })
  const types = [...new Set(entities.map((e) => e.type))].join(', ')
  return [
    `The graph has ${entities.length} entit${entities.length === 1 ? 'y' : 'ies'} (types: ${types}).`,
    'By status:',
    ...byStatus,
    'Refer to entities by their EXACT title when linking or updating.',
  ].join('\n')
}
