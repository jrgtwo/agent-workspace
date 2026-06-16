import type { ToolDef } from '../../core/types'
import type { ProposalStore } from '../../core/proposalStore'
import type { EntityStore } from './entityStore'
import type { GraphProposalPayload } from './types'

export function createGraphTools(deps: { store: EntityStore; proposals: ProposalStore }): ToolDef[] {
  const { store, proposals } = deps
  return [
    {
      name: 'create_entities',
      description:
        'Propose creating one or more entities (typed records) in the graph, shown as a pending change ' +
        'the user accepts or rejects. Gather ALL entities and call this ONCE with a list — never once ' +
        'per entity. Each has a `type` (freeform, e.g. "task"/"note"), a `title`, an optional `status` ' +
        '("To Do"/"Doing"/"Done" — groups it on the board lens), and an optional `body`.',
      parameters: {
        type: 'object',
        properties: {
          entities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                title: { type: 'string' },
                status: { type: 'string' },
                body: { type: 'string' },
              },
              required: ['type', 'title'],
            },
          },
        },
        required: ['entities'],
      },
      handler: (a: { entities?: { type?: string; title?: string; status?: string; body?: string }[] }) => {
        const list = Array.isArray(a?.entities) ? a.entities : []
        const create = list
          .filter((e) => String(e?.title ?? '').trim())
          .map((e) => ({
            type: String(e.type ?? 'item').trim() || 'item',
            title: String(e.title).trim(),
            status: e.status ? String(e.status).trim() : undefined,
            body: e.body ? String(e.body) : undefined,
          }))
        if (!create.length) return { ok: false, error: 'No valid entities (each needs a title).' }
        proposals.propose({
          moduleId: 'graph',
          summary: `Add ${create.length} entit${create.length === 1 ? 'y' : 'ies'}: ${create.map((c) => `"${c.title}"`).join(', ')}`,
          payload: { create } as GraphProposalPayload,
        })
        return { proposed: true, count: create.length, message: `Proposed ${create.length} entit${create.length === 1 ? 'y' : 'ies'}; awaiting your review.` }
      },
    },
    {
      name: 'link_entities',
      description:
        'Propose links (edges) between EXISTING entities, shown as a pending change. Provide a list of ' +
        '{ from, to } pairs naming entities by their EXACT title (or id). A link is directed from → to; ' +
        'the target shows it as a backlink.',
      parameters: {
        type: 'object',
        properties: {
          links: {
            type: 'array',
            items: {
              type: 'object',
              properties: { from: { type: 'string' }, to: { type: 'string' } },
              required: ['from', 'to'],
            },
          },
        },
        required: ['links'],
      },
      handler: (a: { links?: { from?: string; to?: string }[] }) => {
        const list = Array.isArray(a?.links) ? a.links : []
        const entities = store.getState().entities
        const exists = (ref: string) => entities.some((e) => e.id === ref || e.title === ref)
        const link: { from: string; to: string }[] = []
        const skipped: string[] = []
        for (const l of list) {
          const from = String(l?.from ?? '').trim()
          const to = String(l?.to ?? '').trim()
          if (from && to && exists(from) && exists(to)) link.push({ from, to })
          else skipped.push(`${l?.from ?? '?'} → ${l?.to ?? '?'}`)
        }
        if (!link.length) return { ok: false, error: `No valid links — both entities must already exist. Skipped: ${skipped.join('; ')}.` }
        proposals.propose({
          moduleId: 'graph',
          summary: `Link ${link.length}: ${link.map((l) => `${l.from} → ${l.to}`).join(', ')}`,
          payload: { link } as GraphProposalPayload,
        })
        return { proposed: true, count: link.length, ...(skipped.length ? { skipped } : {}), message: `Proposed ${link.length} link${link.length === 1 ? '' : 's'}; awaiting your review.` }
      },
    },
    {
      name: 'update_entity',
      description:
        'Propose updating an existing entity (by EXACT title or id): change its title, status, type, or ' +
        'body. Shown as a pending change the user accepts or rejects.',
      parameters: {
        type: 'object',
        properties: {
          entity: { type: 'string', description: 'Exact title or id of the entity to update.' },
          title: { type: 'string' },
          status: { type: 'string' },
          type: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['entity'],
      },
      handler: (a: { entity?: string; title?: string; status?: string; type?: string; body?: string }) => {
        const ref = String(a?.entity ?? '').trim()
        const target = store.getState().entities.find((e) => e.id === ref || e.title === ref)
        if (!target) return { ok: false, error: `No entity "${ref}".` }
        const patch: { title?: string; status?: string; type?: string; body?: string } = {}
        if (a.title !== undefined) patch.title = String(a.title)
        if (a.status !== undefined) patch.status = String(a.status)
        if (a.type !== undefined) patch.type = String(a.type)
        if (a.body !== undefined) patch.body = String(a.body)
        if (!Object.keys(patch).length) return { ok: false, error: 'Nothing to update.' }
        proposals.propose({
          moduleId: 'graph',
          summary: `Update "${target.title}": ${Object.keys(patch).join(', ')}`,
          payload: { update: [{ id: target.id, patch }] } as GraphProposalPayload,
        })
        return { proposed: true, message: `Proposed update to "${target.title}"; awaiting your review.` }
      },
    },
  ]
}
