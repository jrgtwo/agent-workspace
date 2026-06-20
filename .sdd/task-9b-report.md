# Task 9b Report: Shell + rail Views section + App wiring

## Optional-props / hook branch strategy

`WorkspaceShell` keeps the top-level `useStore(theme)` + `useEffect(applyTheme)` unconditional (React rules of hooks). It then branches based on whether `viewsStore && registry` are both present:
- **Truthy** → renders `<ComposableShell>`, which calls `useStore(viewsStore)` unconditionally inside that child.
- **Falsy** → renders `<LegacyShell>`, identical to the old implementation.

This means all three existing callers (WorkspaceShell.test.tsx, board.render.test.tsx, slice.integration) omit `viewsStore`/`registry` and silently take the LegacyShell path — zero changes needed to those tests.

## ThemeStore adaptation

`ThemeStore` takes no constructor arguments (`new ThemeStore()` is correct). The brief's assumption was accurate; no adaptation needed.

## CSS tokens used

Added to `featureRail.css`:
```css
.rail__views { ... border-top: 1px solid var(--border); }
.rail__btn--new { opacity: 0.7; }
```
Used `var(--border)` (already used by the rail's `border-right`) — no raw hex.

## Test results

| Test | Result |
|------|--------|
| `workspaceShellViews` (new) | PASS (1/1) |
| `WorkspaceShell` (existing) | PASS (2/2) |
| `board.render` (existing) | PASS (1/1) |
| Full suite | 133 passed, 1 failed (pre-existing `slice.integration`) |
| `npx tsc -b --noEmit` | Clean |

## Files changed

- **Created**: `src/shell/workspaceShellViews.render.test.tsx`
- **Modified**: `src/shell/WorkspaceShell.tsx` — rewrote with `LegacyShell`/`ComposableShell` branch; added optional `viewsStore`/`registry` props; imports `ViewArea`, `LayoutStore`, `useRef`
- **Modified**: `src/shell/FeatureRail.tsx` — added optional `views` + `onNewView` props; renders `.rail__views` section with view buttons and "New view" button
- **Modified**: `src/shell/featureRail.css` — added `.rail__views` and `.rail__btn--new` rules using existing tokens
- **Modified**: `src/App.tsx` — added `viewsStore={services.viewsStore} registry={services.registry}` to the `<WorkspaceShell>` call

## Concerns

None. The implementation is straightforward; the optional-props branch keeps all existing tests fully isolated from the new ComposableShell path.
