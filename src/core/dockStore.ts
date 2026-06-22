import { Emitter } from './emitter'

export type DockDrawer = 'plan' | 'preview' | null
export interface DockState { collapsed: boolean; width: number; openDrawer: DockDrawer }

const DEFAULT: DockState = { collapsed: false, width: 360, openDrawer: null }
const MIN_WIDTH = 240
const MAX_WIDTH = 720

function clampWidth(w: unknown): number {
  if (typeof w !== 'number' || Number.isNaN(w)) return DEFAULT.width
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w))
}

export class DockStore extends Emitter<DockState> {
  private state: DockState = DEFAULT

  getState = (): DockState => this.state

  hydrate(state: DockState): void {
    this.state = {
      collapsed: typeof state?.collapsed === 'boolean' ? state.collapsed : DEFAULT.collapsed,
      width: clampWidth(state?.width),
      openDrawer: state?.openDrawer === 'plan' || state?.openDrawer === 'preview' ? state.openDrawer : null,
    }
    this.notify()
  }

  toggleCollapsed(): void {
    this.state = { ...this.state, collapsed: !this.state.collapsed }
    this.notify()
  }

  setWidth(width: number): void {
    this.state = { ...this.state, width: clampWidth(width) }
    this.notify()
  }

  openDrawer(drawer: 'plan' | 'preview'): void {
    this.state = { ...this.state, openDrawer: this.state.openDrawer === drawer ? null : drawer }
    this.notify()
  }

  closeDrawer(): void {
    this.state = { ...this.state, openDrawer: null }
    this.notify()
  }
}
