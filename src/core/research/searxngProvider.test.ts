import { describe, it, expect } from 'vitest'
import { SearxngProvider } from './searxngProvider'

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response
}

describe('SearxngProvider', () => {
  it('maps SearXNG json to trimmed results and respects count', async () => {
    const fetchImpl = (async () => jsonResponse({
      results: Array.from({ length: 10 }, (_, i) => ({
        title: `Title ${i}`, url: `https://www.example${i}.com/path`, content: 'x'.repeat(500), engine: 'google',
      })),
    })) as unknown as typeof fetch
    const p = new SearxngProvider('http://localhost:8888', fetchImpl)
    const out = await p.search('lisbon', { count: 3 })
    expect(out).toHaveLength(3)
    expect(out[0]).toEqual({ title: 'Title 0', url: 'https://www.example0.com/path', snippet: 'x'.repeat(200), source: 'example0.com' })
  })

  it('defaults to 5 results and clamps an over-large count to 15', async () => {
    const fetchImpl = (async () => jsonResponse({
      results: Array.from({ length: 30 }, (_, i) => ({ title: `T${i}`, url: `https://e${i}.com`, content: 'c', engine: 'g' })),
    })) as unknown as typeof fetch
    const p = new SearxngProvider('http://localhost:8888', fetchImpl)
    expect(await p.search('q')).toHaveLength(5)
    expect(await p.search('q', { count: 99 })).toHaveLength(15)
  })

  it('builds the JSON search url with the encoded query', async () => {
    let seen = ''
    const fetchImpl = (async (url: string) => { seen = url; return jsonResponse({ results: [] }) }) as unknown as typeof fetch
    const p = new SearxngProvider('http://localhost:8888', fetchImpl)
    await p.search('best treats')
    expect(seen).toBe('http://localhost:8888/search?q=best%20treats&format=json')
  })

  it('returns [] for an empty result set', async () => {
    const fetchImpl = (async () => jsonResponse({ results: [] })) as unknown as typeof fetch
    const p = new SearxngProvider('http://localhost:8888', fetchImpl)
    expect(await p.search('q')).toEqual([])
  })

  it('throws a friendly error when the fetch fails', async () => {
    const fetchImpl = (async () => { throw new Error('connrefused') }) as unknown as typeof fetch
    const p = new SearxngProvider('http://localhost:8888', fetchImpl)
    await expect(p.search('q')).rejects.toThrow(/couldn't reach your search provider/i)
  })

  it('throws on a non-OK HTTP response', async () => {
    const fetchImpl = (async () => jsonResponse({}, false, 403)) as unknown as typeof fetch
    const p = new SearxngProvider('http://localhost:8888', fetchImpl)
    await expect(p.search('q')).rejects.toThrow(/search provider error \(http 403\)/i)
  })
})
