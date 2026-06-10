import type { ResearchProvider, ResearchResult } from './types'

interface SearxngItem { title?: string; url?: string; content?: string; engine?: string }

const SNIPPET_MAX = 200
const DEFAULT_COUNT = 5
const MAX_COUNT = 15

function host(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

/** Research provider backed by a local SearXNG instance (JSON API). */
export class SearxngProvider implements ResearchProvider {
  readonly id = 'searxng'
  readonly label = 'SearXNG (self-hosted)'
  private baseUrl: string
  private fetchImpl: typeof fetch

  constructor(baseUrl: string, fetchImpl: typeof fetch = fetch) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.fetchImpl = fetchImpl
  }

  async search(query: string, opts?: { count?: number }): Promise<ResearchResult[]> {
    const count = Math.max(1, Math.min(MAX_COUNT, opts?.count ?? DEFAULT_COUNT))
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&format=json`
    const doFetch = this.fetchImpl // unbound: native fetch throws "Illegal invocation" called as a method
    let res: Response
    try {
      res = await doFetch(url)
    } catch {
      throw new Error("couldn't reach your search provider — is it running?")
    }
    if (!res.ok) throw new Error(`search provider error (HTTP ${res.status}).`)
    const body = (await res.json()) as { results?: SearxngItem[] }
    const items = Array.isArray(body.results) ? body.results : []
    return items.slice(0, count).map((r) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      snippet: String(r.content ?? '').slice(0, SNIPPET_MAX),
      source: host(r.url ?? '') || String(r.engine ?? ''),
    }))
  }
}
