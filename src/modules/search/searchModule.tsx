import { useStore } from '../../core/emitter'
import type { ToolDef, WorkspaceModule } from '../../core/types'
import type { ResearchProvider } from '../../core/research/types'
import type { SearchResultsStore } from './searchResultsStore'
import './searchResults.css'

const DEFAULT_COUNT = 5
const MAX_COUNT = 15

function ResultsPanel({ store }: { store: SearchResultsStore }) {
  const { query, results, status, error } = useStore(store)
  return (
    <div className="search-results">
      <div className="search-results__head">RESULTS{query ? ` · ${query}` : ''}</div>
      {status === 'idle' && <p className="search-results__empty">Ask the agent to look something up — results appear here.</p>}
      {status === 'searching' && <p className="search-results__empty">Searching…</p>}
      {status === 'error' && <p className="search-results__error">Search failed: {error}</p>}
      {status === 'done' && results.length === 0 && <p className="search-results__empty">No results.</p>}
      {results.map((r, i) => (
        <div key={i} className="search-results__item">
          <a className="search-results__title" href={r.url} target="_blank" rel="noreferrer">{r.title || r.url}</a>
          <div className="search-results__src">{r.source}</div>
          <div className="search-results__snippet">{r.snippet}</div>
        </div>
      ))}
    </div>
  )
}

export function createSearchModule(provider: ResearchProvider, results: SearchResultsStore): WorkspaceModule {
  const webSearch: ToolDef = {
    name: 'web_search',
    description:
      'Search the WEB for up-to-date information the local model and documents do not have (e.g. travel ' +
      'ideas, current facts). Returns 5 results by default; pass a higher `count` (up to 15) ONLY when the ' +
      'user explicitly asks for more, e.g. a top-10 list. After results return, write a concise answer that ' +
      'CITES the sources (title + url). This sends the query off-device, so the user is asked to approve it.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query.' },
        count: { type: 'number', description: 'How many results to return (default 5, max 15).' },
      },
      required: ['query'],
    },
    permission: {
      kind: 'read',
      resource: 'web-search',
      locality: 'NETWORK',
      describe: (a) => `Search the web for "${(a as { query?: string })?.query ?? ''}"? This query will be sent to your search provider.`,
    },
    handler: async (a: { query: string; count?: number }) => {
      const query = String(a?.query ?? '').trim()
      if (!query) return { ok: false, error: '`query` is required.' }
      const count = Math.max(1, Math.min(MAX_COUNT, a?.count ?? DEFAULT_COUNT))
      results.setSearching(query)
      try {
        const found = await provider.search(query, { count })
        results.setResults(query, found)
        return { ok: true, count: found.length, results: found.map((r) => ({ title: r.title, url: r.url, snippet: r.snippet })) }
      } catch (e) {
        const error = (e as Error).message
        results.setError(query, error)
        return { ok: false, error }
      }
    },
  }

  return {
    id: 'search-results',
    title: 'Results',
    locality: 'NETWORK',
    layoutHints: { defaultSize: 55, collapsible: true, minSize: 25 },
    render: () => <ResultsPanel store={results} />,
    tools: [webSearch],
  }
}
