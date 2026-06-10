import { describe, it, expect } from 'vitest'
import { SearchResultsStore } from './searchResultsStore'

describe('SearchResultsStore', () => {
  it('tracks searching → results → error and notifies', () => {
    const store = new SearchResultsStore()
    let n = 0
    store.subscribe(() => { n++ })
    expect(store.getState().status).toBe('idle')
    store.setSearching('lisbon')
    expect(store.getState()).toMatchObject({ status: 'searching', query: 'lisbon', results: [] })
    store.setResults('lisbon', [{ title: 'T', url: 'https://x.com', snippet: 's', source: 'x.com' }])
    expect(store.getState()).toMatchObject({ status: 'done', results: [{ title: 'T' }] })
    store.setError('lisbon', 'boom')
    expect(store.getState()).toMatchObject({ status: 'error', error: 'boom', results: [] })
    expect(n).toBe(3)
  })
})
