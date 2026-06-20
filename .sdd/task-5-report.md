# Task 5 Report: Tabbed viewer UI + wire connectors onto OpenDocsStore

## Status: DONE

## Files Changed (10 total)

### New files
- `src/modules/connectors/connectorsViewerTabs.render.test.tsx` — NEW tab-switching render test (5.8)

### Fully rewritten
- `src/modules/connectors/ConnectorsViewer.tsx` — replaced scratch/save/proposals/applier props with `{ open: OpenDocsStore }`; renders tab bar + SaveBar + DocEditorPanel
- `src/modules/connectors/connectorsViewerModule.tsx` — signature changed from `(scratch, save)` to `(open: OpenDocsStore)`
- `src/modules/connectors/openInViewerTool.ts` — deps changed from `{ client, scratch }` to `{ open: OpenDocsStore }`; handler uses `open.open()` + returns `{ ok, name, text }`

### Edited
- `src/modules/connectors/connectorsFs.ts` — removed `openFileIntoViewer` function and its `DocEditorStore` import; kept `basename` and `writeFileToDisk`
- `src/features/connectors.ts` — removed `scratch: DocEditorStore` and `save: ConnectorsSaveStore` deps; added `open: OpenDocsStore`; updated viewer creation call
- `src/app/services.ts` — removed `ConnectorsSaveStore` import (~line 52) and `openFileIntoViewer` import (~line 54); added `OpenDocsStore` import; replaced `connectorsScratch` + `connectorsSave` construction with single `openDocs = new OpenDocsStore(mcpClient)`; updated tool registration and feature call
- `src/modules/connectors/connectors.css` — added 7 new CSS rules for tab bar (`.connectors-viewer__tabs`, `.connectors-tab`, `.connectors-tab--active`, `.connectors-tab__close`, `.connectors-viewer__empty`)

### Test migrations
- `src/modules/connectors/connectorsViewerModule.test.tsx` — MIGRATED: now uses `OpenDocsStore`; opens a file before rendering, asserts content appears
- `src/modules/connectors/connectorsViewerSave.render.test.tsx` — MIGRATED: opens a file via `OpenDocsStore`, spies on `activeDoc().save.save()`, asserts Save enables after edit
- `src/modules/connectors/connectorsViewerClose.render.test.tsx` — MIGRATED (not deleted): re-expressed as tab-close tests (empty state, clean close, cancel-on-dirty, confirm-close-dirty); uses `act()` to wrap `setText` calls
- `src/modules/connectors/openInViewerTool.test.ts` — MIGRATED: uses `createOpenInViewerTool({ open })`, asserts tab is created and `{ ok, name, text }` returned; error case asserts 0 tabs

## CSS Token Names Used
- `--border` — tab bar separators and tab right borders
- `--text-muted` — inactive tab color, empty state text (brief said `--text-dim` which does NOT exist; `--text-muted` is the correct repo token)
- `--text` — active tab color
- `--accent` — active tab bottom border indicator

## DocEditorStore import in services.ts
KEPT. `DocEditorStore` is still used in services.ts at line 173 (`docStore: DocEditorStore` in the `AppServices` interface return type) and line 206 (`const docStore = new DocEditorStore('Untitled.md', '')` for the Notes feature). The connectors-specific uses (`connectorsScratch`) were removed.

## Test Results
- `npm test -- connectors`: 11 files, 40 tests — all PASS
- `npm test`: 130 files, 525 tests — 129 PASS, 1 FAIL (pre-existing `slice.integration` failure, untouched)
- `npx tsc -b --noEmit`: CLEAN (one unused import caught and removed)

## Concerns
None. The only non-obvious fix was wrapping `doc.setText()` in `act()` in the close tests so React re-renders (and updates `t.dirty` in the tabs closure) before the click handler runs.
