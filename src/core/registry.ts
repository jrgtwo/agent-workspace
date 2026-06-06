import type { ToolDef } from './types'

export class Registry {
  private tools = new Map<string, ToolDef>()

  register(tools: ToolDef[]): void {
    for (const t of tools) this.tools.set(t.name, t)
  }

  get(name: string): ToolDef | undefined {
    return this.tools.get(name)
  }

  all(): ToolDef[] {
    return [...this.tools.values()]
  }
}
