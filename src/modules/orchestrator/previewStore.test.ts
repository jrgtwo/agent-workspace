import { describe, it, expect } from 'vitest'
import { PreviewStore } from './previewStore'

describe('PreviewStore', () => {
  it('starts with no focused feature', () => {
    expect(new PreviewStore().getState().focusedFeature).toBeNull()
  })

  it('focus() sets the focused feature and notifies', () => {
    const store = new PreviewStore()
    let notified = 0
    store.subscribe(() => { notified++ })
    store.focus('kanban')
    expect(store.getState().focusedFeature).toBe('kanban')
    expect(notified).toBe(1)
    store.focus(null)
    expect(store.getState().focusedFeature).toBeNull()
    expect(notified).toBe(2)
  })
})
