import { describe, it, expect } from 'vitest'
import { ThemeStore, applyTheme, THEMES, DEFAULT_THEME } from './themeStore'

describe('ThemeStore', () => {
  it('defaults to the Terminal CRT theme', () => {
    expect(new ThemeStore().getState()).toEqual({ theme: 'terminal-crt' })
    expect(DEFAULT_THEME).toBe('terminal-crt')
  })

  it('switches to a valid theme and notifies subscribers', () => {
    const store = new ThemeStore()
    let calls = 0
    store.subscribe(() => { calls++ })
    store.setTheme('midnight')
    expect(store.getState()).toEqual({ theme: 'midnight' })
    expect(calls).toBe(1)
  })

  it('ignores invalid theme ids', () => {
    const store = new ThemeStore()
    // @ts-expect-error testing runtime guard
    store.setTheme('bogus')
    expect(store.getState()).toEqual({ theme: 'terminal-crt' })
  })

  it('hydrates valid saved state and falls back on garbage', () => {
    const a = new ThemeStore(); a.hydrate({ theme: 'terminal-crt' })
    expect(a.getState()).toEqual({ theme: 'terminal-crt' })
    const b = new ThemeStore(); b.hydrate({ theme: 'nope' } as never)
    expect(b.getState()).toEqual({ theme: 'terminal-crt' })
  })

  it('exposes the selectable themes in order', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['terminal', 'terminal-crt', 'midnight', 'faded-amber', 'gameboy', 'synthwave'])
  })

  it('applyTheme sets the data-theme attribute on the given root', () => {
    const root = document.createElement('html')
    applyTheme('midnight', root)
    expect(root.getAttribute('data-theme')).toBe('midnight')
  })
})
