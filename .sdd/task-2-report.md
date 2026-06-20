# Task 2 Report: resolveView + modulesForLayout

## Status
DONE

## TDD Evidence

### Step 1: Test written
Created `src/modules/views/resolveView.test.tsx` verbatim from the brief.

### Step 2: RED — confirmed fail
```
npm test -- resolveView
FAIL  src/modules/views/resolveView.test.tsx
Error: Failed to resolve import "./resolveView" from "src/modules/views/resolveView.test.tsx". Does the file exist?
Test Files  1 failed (1)
Tests  no tests
```

### Step 3: Implementation created
Created `src/modules/views/resolveView.ts` verbatim from the brief.

### Step 4: GREEN — confirmed pass
```
npm test -- resolveView
Test Files  1 passed (1)
Tests  3 passed (3)
Duration  661ms
```

### Step 5: Typecheck — clean
```
npx tsc -b --noEmit
(no output — clean)
```

## Files Created
- `src/modules/views/resolveView.ts` — implementation (modulesForLayout, resolveView)
- `src/modules/views/resolveView.test.tsx` — 3 tests (maps ids, drops unknowns, builds FeatureManifest)

## Dependencies Verified
- `src/core/panelRegistry.ts` — PanelRegistry, PanelType, buildRegistry all exist as expected
- `src/core/layoutTree.ts` — collectModuleIds exists, depth-first, returns string[]
- `src/core/types.ts` — LayoutNode, WorkspaceModule, FeatureManifest all exist as expected

## Concerns
None. Implementation is straightforward and all types align.
