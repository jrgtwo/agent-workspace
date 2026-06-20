# Task 7 Report: ViewArea + Add-panel menu

## Status
COMPLETE — all tests pass; tsc clean; only pre-existing slice.integration failure remains.

## Files Changed / Created

| File | Action |
|------|--------|
| `src/modules/views/ViewArea.render.test.tsx` | Created (test) |
| `src/modules/views/AddPanelMenu.tsx` | Created |
| `src/modules/views/ViewArea.tsx` | Created |
| `src/modules/views/views.css` | Created |

## TDD Steps

1. **Test written** → `ViewArea.render.test.tsx` matching the brief exactly.
2. **Confirmed FAIL** → `npm test -- ViewArea` failed with import resolution error (ViewArea.tsx didn't exist).
3. **Implemented `AddPanelMenu.tsx`** → toggle button opens `role="menu"` div listing registry panels not in `present`.
4. **Implemented `ViewArea.tsx`** → uses `useStore(layoutStore)` for reactive layout, builds manifest from layout+registry, renders bar (title, AddPanelMenu, optional Reset for builtIn) over `PanelArea`.
5. **Implemented `views.css`** → all styles using real CSS tokens (see below).
6. **Confirmed PASS** → `npm test -- ViewArea` → 1 passed.
7. **Typecheck** → `npx tsc -b --noEmit` → clean (no output).
8. **Full suite** → `npm test` → 131 passed, 1 failed (pre-existing `slice.integration.test.tsx`).

## CSS Tokens Used

All tokens verified to exist in `src/styles/tokens.semantic.css` and theme files. No substitutions needed — the task brief's token names matched exactly:

- `--border` ✓
- `--text-muted` ✓
- `--accent` ✓
- `--text` ✓
- `--surface` ✓
- `--surface-2` ✓

No raw hex used.

## Concerns

None. Implementation is minimal (YAGNI). The `viewsStore` prop is used in the Reset handler even though the happy-path test doesn't click Reset — this is intentional per the brief (Task 9 relies on this signature).
