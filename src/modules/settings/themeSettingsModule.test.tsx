import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { createThemeSettingsModule } from './themeSettingsModule'
import { ThemeStore, THEMES } from '../../core/themeStore'

afterEach(() => cleanup())

describe('themeSettingsModule', () => {
  it('has no tools and renders a card per theme', () => {
    const mod = createThemeSettingsModule(new ThemeStore())
    expect(mod.id).toBe('theme-settings')
    expect(mod.tools).toEqual([])
    render(mod.render())
    for (const t of THEMES) {
      expect(screen.getByRole('button', { name: t.label })).toBeInTheDocument()
    }
  })

  it('marks the active theme with aria-pressed', () => {
    const store = new ThemeStore(); store.hydrate({ theme: 'midnight' })
    render(createThemeSettingsModule(store).render())
    expect(screen.getByRole('button', { name: 'Midnight' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Terminal' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches the theme when a card is clicked', () => {
    const store = new ThemeStore()
    render(createThemeSettingsModule(store).render())
    fireEvent.click(screen.getByRole('button', { name: 'Terminal CRT' }))
    expect(store.getState().theme).toBe('terminal-crt')
  })
})
