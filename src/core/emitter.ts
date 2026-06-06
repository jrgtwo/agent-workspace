import { useSyncExternalStore } from 'react'

export abstract class Emitter<TState> {
  private listeners = new Set<() => void>()
  abstract getState(): TState
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  protected notify(): void {
    this.listeners.forEach((l) => l())
  }
}

export function useStore<TState>(store: {
  subscribe: (l: () => void) => () => void
  getState: () => TState
}): TState {
  return useSyncExternalStore(store.subscribe, store.getState)
}
