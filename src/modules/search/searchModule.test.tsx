import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createSearchModule } from './searchModule'
import { SearchResultsStore } from './searchResultsStore'
import type { ResearchProvider, ResearchResult } from '../../core/research/types'

function fakeProvider(results: ResearchResult[], spy?: (q: string, c?: number) => void): ResearchProvider {
  return { id: 'fake', label: 'Fake', search: async (q, opts) => { spy?.(q, opts?.count); return results } }
}
const tool = (mod: { tools: { name: string }[] }, name: string) => (mod.tools as any).find((t: any) => t.name === name)

describe('searchModule web_search tool', () => {
  it('declares a NETWORK read permission (so the broker pops the consent dialog)', () => {
    const mod = createSearchModule(fakeProvider([]), new SearchResultsStore())
    const ws = tool(mod, 'web_search')!
    expect(ws.permission).toMatchObject({ kind: 'read', locality: 'NETWORK', resource: 'web-search' })
    expect(ws.permission.describe({ query: 'lisbon' })).toMatch(/search the web for "lisbon"/i)
  })

  it('calls the provider with the default count (5), stores results, returns a compact list', async () => {
    let seen: { q: string; c?: number } = { q: '' }
    const results = [{ title: 'T', url: 'https://x.com/a', snippet: 's', source: 'x.com' }]
    const store = new SearchResultsStore()
    const mod = createSearchModule(fakeProvider(results, (q, c) => { seen = { q, c } }), store)
    const res = await tool(mod, 'web_search')!.handler({ query: 'lisbon' })
    expect(seen).toEqual({ q: 'lisbon', c: 5 })
    expect(res).toMatchObject({ ok: true, count: 1, results: [{ title: 'T', url: 'https://x.com/a', snippet: 's' }] })
    expect(store.getState()).toMatchObject({ status: 'done', results })
  })

  it('clamps count to 15 and passes a user-requested higher count through', async () => {
    let seenCount: number | undefined
    const mod = createSearchModule(fakeProvider([], (_q, c) => { seenCount = c }), new SearchResultsStore())
    await tool(mod, 'web_search')!.handler({ query: 'treats', count: 99 })
    expect(seenCount).toBe(15)
  })

  it('on provider error, sets error state and returns a friendly error', async () => {
    const store = new SearchResultsStore()
    const failing: ResearchProvider = { id: 'f', label: 'f', search: async () => { throw new Error('down') } }
    const mod = createSearchModule(failing, store)
    const res = await tool(mod, 'web_search')!.handler({ query: 'q' })
    expect(res).toMatchObject({ ok: false })
    expect(store.getState().status).toBe('error')
  })

  it('renders results as clickable links', () => {
    const store = new SearchResultsStore()
    const mod = createSearchModule(fakeProvider([]), store)
    store.setResults('lisbon', [{ title: 'Lisbon Guide', url: 'https://x.com/lisbon', snippet: 'visit', source: 'x.com' }])
    render(mod.render())
    const link = screen.getByRole('link', { name: /lisbon guide/i }) as HTMLAnchorElement
    expect(link.href).toContain('https://x.com/lisbon')
    expect(screen.getByText('visit')).toBeTruthy()
  })
})
