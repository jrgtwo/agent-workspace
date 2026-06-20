# Task 3 Report: ViewsStore

## Status
DONE — all tests green, typecheck clean.

## Files Changed
- Created: `src/modules/views/viewsStore.ts`
- Created: `src/modules/views/viewsStore.test.ts`

## TDD Evidence

### Step 2 — Red
```
FAIL  src/modules/views/viewsStore.test.ts
Error: Failed to resolve import "./viewsStore" — Does the file exist?
Tests: no tests (suite error, module not found)
```

### Step 4 — Green (after implementation)
```
Test Files  1 passed (1)
     Tests  6 passed (6)
  Duration  740ms
```

### Step 6 — Typecheck
`npx tsc -b --noEmit` produced no output (clean).

## Storage API Adaptations
The brief's Step 5 template imports `StorageService` from `../../core/storage/storageService`.
The real path is `../../core/storage/storage` (the class lives in `storage.ts`, not `storageService.ts`).

All other imports matched exactly:
- `MemoryBackend` → `../../core/storage/memoryBackend` ✓
- `persistState` → `../../core/storage/persistState` ✓
- `storage.scope(namespace)` returns a `ScopedStore` with `.get/.set/.delete/.keys` ✓
- `persistState(store, scoped, key, debounceMs?)` signature ✓

The test was written with the corrected import path from the start.

## Implementation Notes
- `pruneToRegistry` iterates `collectModuleIds` and calls `removePanel` for each unknown id. If `removePanel` collapses the whole tree to null (all panels were unknown), it falls back to the original `layout` — preserves at least something rather than crashing.
- `hydrate` prepends missing built-ins so they appear before user views (consistent ordering).
- `getState` is an arrow function (required by `Emitter`'s abstract contract and `persistState`'s `Persistable<T>` interface).
- `erasableSyntaxOnly` constraint respected: no constructor parameter properties; all fields declared explicitly.

## Concerns
None. The implementation is straightforward and matches the spec exactly.
