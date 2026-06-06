import type { ScopedStore } from './types'

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: A) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

interface Persistable<T> {
  getState: () => T
  subscribe: (listener: () => void) => () => void
  hydrate: (state: T) => void
}

/**
 * Restore a store's state from storage on init, then auto-save (debounced) on every change.
 * Subscription is added AFTER hydrate, so loading does not trigger a redundant save.
 */
export async function persistState<T>(
  store: Persistable<T>,
  scoped: ScopedStore,
  key: string,
  debounceMs = 400,
): Promise<void> {
  const saved = await scoped.get<T>(key)
  if (saved !== undefined) store.hydrate(saved)

  const save = debounce(() => {
    void scoped.set(key, store.getState())
  }, debounceMs)

  store.subscribe(save)
}
