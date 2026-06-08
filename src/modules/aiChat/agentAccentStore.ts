import { Emitter } from '../../core/emitter'

export interface AgentAccentState {
  /** A 6-digit hex, or null to fall back to the theme default (var(--info)). */
  color: string | null
}

const HEX = /^#[0-9a-fA-F]{6}$/

export function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && HEX.test(v)
}

/**
 * Holds the user's chosen agent-card accent color (a global override of the theme default).
 * Seed of per-(sub)agent labeling: today one color; later map agentId → color.
 */
export class AgentAccentStore extends Emitter<AgentAccentState> {
  private state: AgentAccentState = { color: null }

  getState = (): AgentAccentState => this.state

  hydrate(state: AgentAccentState): void {
    this.state = { color: isHexColor(state?.color) ? state.color : null }
    this.notify()
  }

  setColor(hex: string): void {
    if (!isHexColor(hex) || hex === this.state.color) return
    this.state = { color: hex }
    this.notify()
  }

  reset(): void {
    if (this.state.color === null) return
    this.state = { color: null }
    this.notify()
  }
}
