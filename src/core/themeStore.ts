import { Emitter } from './emitter'

export const THEME_IDS = ['terminal', 'terminal-crt', 'midnight', 'faded-amber', 'gameboy', 'synthwave'] as const
export type ThemeId = (typeof THEME_IDS)[number]
export const DEFAULT_THEME: ThemeId = 'terminal-crt'

export interface ThemeMeta { id: ThemeId; label: string }
export const THEMES: ThemeMeta[] = [
  { id: 'terminal', label: 'Terminal' },
  { id: 'terminal-crt', label: 'Terminal CRT' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'faded-amber', label: 'Faded Amber' },
  { id: 'gameboy', label: 'Game Boy' },
  { id: 'synthwave', label: 'Synthwave' },
]

export interface ThemeState { theme: ThemeId }

function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && (THEME_IDS as readonly string[]).includes(v)
}

/** Apply the active theme to the document (sets the [data-theme] attribute). */
export function applyTheme(theme: ThemeId, root: HTMLElement = document.documentElement): void {
  root.setAttribute('data-theme', theme)
}

export class ThemeStore extends Emitter<ThemeState> {
  private state: ThemeState = { theme: DEFAULT_THEME }

  getState = (): ThemeState => this.state

  hydrate(state: ThemeState): void {
    this.state = { theme: isThemeId(state?.theme) ? state.theme : DEFAULT_THEME }
    this.notify()
  }

  setTheme(theme: ThemeId): void {
    if (!isThemeId(theme) || theme === this.state.theme) return
    this.state = { theme }
    this.notify()
  }
}
