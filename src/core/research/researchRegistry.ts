import type { ResearchProvider } from './types'

/** Holds research providers by id — the seam for adding more "research entities" later. */
export class ResearchRegistry {
  private providers = new Map<string, ResearchProvider>()
  register(provider: ResearchProvider): void { this.providers.set(provider.id, provider) }
  get(id: string): ResearchProvider | undefined { return this.providers.get(id) }
  list(): ResearchProvider[] { return [...this.providers.values()] }
}
