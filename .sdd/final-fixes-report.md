# Final-Fixes Report

## Fix 1 — Freshly-opened files wrongly show "unsaved changes"

**File changed:** `src/modules/connectors/openDocsStore.ts` (line 33)
Added `setTimeout(() => save.rebaseline(), 50)` at the end of `open()`, after the final `this.sync()`.

**Test file changed:** `src/modules/connectors/openDocsStore.test.ts`
- Added `vi` to vitest import (line 1).
- Added new test `'re-baselines shortly after open so editor normalization does not mark it dirty'` using `vi.useFakeTimers({ toFake: ['setTimeout'] })`.

**Test run:** `npm test -- openDocsStore` → 5 passed (5 tests including the new regression test).

---

## Fix 2 — Two reset controls inside a composable view

**File changed:** `src/shell/PanelArea.tsx` (line 61–68)
Added optional prop `showReset?: boolean` (default `true`); the `panel-area__reset` button is now gated: `{showReset !== false && <button ...>}`.

**File changed:** `src/modules/views/ViewArea.tsx` (line 29)
Passed `showReset={false}` to the `<PanelArea />` it renders.

**Test run:** `npm test -- PanelArea` → 3 passed; `npm test -- panelAreaRemove` → 1 passed; `npm test -- ViewArea` → 1 passed.

---

## Fix 3 — Delete orphaned CSS

**File changed:** `src/modules/connectors/connectors.css`
Deleted three rules: `.connectors-viewer__name`, `.connectors-viewer__close`, `.connectors-viewer__close:hover`.
Confirmed via grep: zero `.tsx`/`.ts` references to those class names. Retained `.connectors-viewer__bar`, `__status`, `__save`.

---

## Full Test Suite

`npm test` → 534 passed, 1 failed (pre-existing `slice.integration` failure — unrelated to these changes).

`npm test -- connectors` → 41 passed (11 test files).

---

## TypeScript

`npx tsc -b --noEmit` → clean (no output, exit 0).
