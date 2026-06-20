# Task 8 Report: PanelArea per-panel remove control

## Status
COMPLETE — all tests green, tsc clean.

## Pre-change shape check
`src/shell/PanelArea.tsx` matched the brief's assumed shape exactly (same imports, same `FragmentWithHandle`, same reset button). Applied targeted edits rather than overwriting.

## Token names used
`--text-muted` (default color) and `--text` (hover color) — confirmed in the existing `.panel-frame__grip` rule in `panelArea.css`.

## Files changed

### `src/shell/PanelArea.tsx`
Three surgical edits:
1. `PanelFrame` props: added `onRemove?: (id: string) => void`; renders `<button class="panel-frame__remove" aria-label="remove {title}">✕</button>` only when `draggable && onRemove`.
2. `renderNode`: added optional `onRemove?` param, threads it through to `PanelFrame`.
3. `PanelArea`: added `onRemovePanel?: (moduleId: string) => void` prop, passes it as `onRemove` to `PanelFrame` (single-panel path) and `renderNode` (split path).

### `src/shell/panelArea.css`
Added `.panel-frame__remove` and `.panel-frame__remove:hover` rules after `.panel-frame__grip:active`, mirroring the grip token usage.

### `src/shell/panelAreaRemove.render.test.tsx` (new)
New test file per the brief.

## Test results

### `npm test -- panelAreaRemove` (new test)
- RED before implementation: 1 failed (button not found)
- GREEN after implementation: 1 passed (1)

### `npm test -- PanelArea` (regression)
- 2 test files, 3 tests — all passed

### `npx tsc -b --noEmit`
- Clean (no output, exit 0)

## Concerns
None. The prop is optional so existing features (notes, connectors) that don't pass `onRemovePanel` are unaffected.
