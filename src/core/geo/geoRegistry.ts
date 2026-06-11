import type { GeoProvider } from './types'

/** Holds geo providers by id — the seam for swapping in a self-hosted provider later. */
export class GeoRegistry {
  private providers = new Map<string, GeoProvider>()
  register(provider: GeoProvider): void { this.providers.set(provider.id, provider) }
  get(id: string): GeoProvider | undefined { return this.providers.get(id) }
  list(): GeoProvider[] { return [...this.providers.values()] }
}
