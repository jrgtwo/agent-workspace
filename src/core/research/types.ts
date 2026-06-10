/** One web result, already trimmed for the model. */
export interface ResearchResult {
  title: string
  url: string
  snippet: string
  source: string   // host (e.g. "wikipedia.org") or engine name, for display/citation
}

/** A pluggable knowledge source. The first adapter is SearXNG; others (Wikipedia, Tavily, …) slot in later. */
export interface ResearchProvider {
  id: string
  label: string
  search(query: string, opts?: { count?: number }): Promise<ResearchResult[]>
}
