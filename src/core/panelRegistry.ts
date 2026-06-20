import type { WorkspaceModule } from './types'

export interface PanelType {
  id: string
  label: string
  icon: string
  module: WorkspaceModule
}
export type PanelRegistry = Map<string, PanelType>

export function buildRegistry(types: PanelType[]): PanelRegistry {
  return new Map(types.map((t) => [t.id, t]))
}
