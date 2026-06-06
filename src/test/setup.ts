import '@testing-library/jest-dom/vitest'

// jsdom does not implement ResizeObserver, which react-resizable-panels (v4) uses
// to measure groups on mount. Provide a no-op stub so panel layouts can render in tests.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver)
