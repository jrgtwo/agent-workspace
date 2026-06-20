# Task 6 Report: LayoutStore add/remove panel

## Implementation

### TDD Red Phase
Appended 4 new tests to `src/core/layoutStore.test.ts` (the file already existed with 7 passing tests). Ran `npm test -- layoutStore` → 4 failures: `addPanel/removePanelById is not a function`.

### Implementation
1. Updated import line in `src/core/layoutStore.ts`:
   - Before: `import { collectModuleIds, move as moveNode, type Zone } from './layoutTree'`
   - After: `import { collectModuleIds, insertRelative, move as moveNode, normalize, removePanel, type Zone } from './layoutTree'`
2. Added `addPanel(moduleId: string): void` and `removePanelById(moduleId: string): void` methods after `move()`, verbatim from the brief.

### TDD Green Phase
`npm test -- layoutStore` → 11 passed (7 pre-existing + 4 new).

### Typecheck
`npx tsc -b --noEmit` → clean (no output).

## Files Changed
- `src/core/layoutStore.ts` — updated import, added two methods
- `src/core/layoutStore.test.ts` — appended 4 new tests + `collectModuleIds` import

## Test summary
11/11 passed; tsc clean; existing move/reset/hydrate/reconcile untouched.

## Concerns
None.

---

## Post-review Fixes (code-review pass)

### Fix 1 (Important): phantom notify on removePanelById for absent id
`src/core/layoutStore.ts` — `removePanelById` previously called `collectModuleIds` once and only guarded `length <= 1`. If the given `moduleId` was absent from a multi-panel layout, `removePanel` would still return a new (referentially different) tree and `notify()` would fire with a semantically-identical layout.

Added an early return after the length guard:
```ts
if (!ids.includes(moduleId)) return
```
`collectModuleIds` result is now stored in `ids` (one call, reused for both guards), matching the implementation pattern from the brief.

### Fix 2 (Minor): mid-file imports moved to top
`src/core/layoutStore.test.ts` — the `import { LayoutStore }` and `import { collectModuleIds }` statements that were appended mid-file during the initial implementation were moved to the top of the file with the other imports. Duplicate `LayoutNode` type import was not introduced (it was already at the top). `LayoutStore` was merged into the existing `./layoutStore` import line.

### Regression test added
Added to the `LayoutStore add/remove` describe block:
```ts
it('does not notify when removing an id that is not present', ...)
```
Verifies: no subscriber call fires, and `getState().layout` remains the exact same reference (`base`).

### Verification
- `npm test -- layoutStore` → **12/12 passed** (11 pre-existing + 1 new regression test)
- `npx tsc -b --noEmit` → **clean** (no output)
