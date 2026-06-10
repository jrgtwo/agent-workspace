import { Emitter } from '../../core/emitter'
import type { ResearchResult } from '../../core/research/types'

export type SearchStatus = 'idle' | 'searching' | 'done' | 'error'
export interface SearchResultsState { query: string; results: ResearchResult[]; status: SearchStatus; error?: string }

/** Holds the latest search's query/results/status so the panel can show the raw sources. Ephemeral. */
export class SearchResultsStore extends Emitter<SearchResultsState> {
  private state: SearchResultsState = { query: '', results: [], status: 'idle' }
  getState = (): SearchResultsState => this.state
  setSearching(query: string): void { this.state = { query, results: [], status: 'searching' }; this.notify() }
  setResults(query: string, results: ResearchResult[]): void { this.state = { query, results, status: 'done' }; this.notify() }
  setError(query: string, error: string): void { this.state = { query, results: [], status: 'error', error }; this.notify() }
}
