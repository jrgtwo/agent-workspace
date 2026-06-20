# Task 4 Report: OpenDocsStore (tabbed open files)

## Status
COMPLETE — all tests pass, typecheck clean.

## Files Changed
- Created: `src/modules/connectors/openDocsStore.ts`
- Created: `src/modules/connectors/openDocsStore.test.ts`

## TDD Evidence

### Red (failing)
```
npm test -- openDocsStore
FAIL  src/modules/connectors/openDocsStore.test.ts
Error: Failed to resolve import "./openDocsStore" — file does not exist yet.
Test Files: 1 failed (1), Tests: 0
```

### Green (passing)
```
npm test -- openDocsStore
Test Files  1 passed (1)
Tests       4 passed (4)
Duration    674ms
```

### Typecheck
```
npx tsc -b --noEmit
(no output — clean)
```

## API Verification

All APIs matched the brief exactly — no adaptations needed:

- **`McpClient.call(name, args)`** — returns `Promise<{ ok: boolean; text: string; error?: string }>`. Matches.
- **`DocEditorStore`** — `new DocEditorStore(name)`, `hydrate({ name, text, sourcePath })`, `setText(text)`, `getState()`, `subscribe(fn)`. Matches.
- **`ConnectorsSaveStore`** — `new ConnectorsSaveStore({ client, scratch })`, `getState(): { dirty, status, error? }`, `subscribe(fn)`, `save()`. Matches.
  - One detail noted: `ConnectorsSaveStore` internally calls `deps.scratch.subscribe(this.onScratch)` in its constructor. This means the `save` store already subscribes to `doc` changes. The `open()` method additionally subscribes `doc` and `save` to `sync()` for re-rendering the tab dirty flags — this is correct and doesn't conflict.
- **`basename(path)`** — exported from `connectorsFs.ts`. Matches.

## Implementation Notes

The implementation is verbatim from the brief. Key behaviors:
1. `open()` deduplicates by path before any async work, keeping the `docs` array stable.
2. `sync()` rebuilds `state.tabs` from `docs` on every doc/save change, so dirty flags stay current.
3. `close()` prefers the previous-index neighbor (`i - 1`), clamped to 0.
4. The `Emitter` abstract class declares `getState()` as abstract; the arrow-function property form (`getState = (): OpenDocsState => this.state`) satisfies this correctly in TypeScript with `erasableSyntaxOnly: true`.

## Concerns
None. Store is free of `window.confirm` as required; dirty-close dialog is deferred to the UI layer (Task 5).
