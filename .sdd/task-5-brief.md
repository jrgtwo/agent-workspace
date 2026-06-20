# Task 5: Tabbed viewer UI + switch the Connectors feature onto OpenDocsStore

Part of "Composable Views (v1)", Phase 2. This task replaces the connectors feature's single-file
scratch viewer with the tabbed `OpenDocsStore` (Task 4), end-to-end, so the whole connectors feature
uses tabs and the build stays green. It's a coordinated multi-file change — do all of it, then run the
FULL `npm test` + `npx tsc -b --noEmit` and fix any ripple.

## Global Constraints
- erasableSyntaxOnly (no ctor param properties). Stores extend Emitter (state + notify). File I/O via McpClient only.
- No raw hex in CSS — use existing tokens from `src/styles/` (grep for the real names, e.g. `--border`, `--accent`, `--text`, surface tokens). Match repo style. YAGNI.
- Tests run in jsdom; the panel lib needs `fireEvent` (not userEvent). jsdom renders Milkdown/text fine.
- Do NOT run any git command. Leave changes uncommitted.

## Interfaces CONSUMED (exist)
- `OpenDocsStore` (Task 4, `src/modules/connectors/openDocsStore.ts`): `new OpenDocsStore(client)`, `getState(): { tabs: {path,name,dirty}[]; activePath? }`, `activeDoc(): OpenDoc | undefined` where `OpenDoc = { path; name; doc: DocEditorStore; save: ConnectorsSaveStore }`, `open(path): Promise<void>`, `activate(path)`, `close(path)`.
- `DocEditorPanel` — `src/modules/docEditor/docEditorModule.tsx` (existing; props `{ store, proposals, applier }`).
- `ProposalStore`, `ProposalApplier` — `src/core/proposalStore.ts`, `src/core/proposalApplier.ts`.
- `useStore` — `src/core/emitter.ts`.

## The changes (do all)

### 5.1 — Rewrite `src/modules/connectors/ConnectorsViewer.tsx`
Replace its entire contents with a tab-bar + active-doc view bound to `OpenDocsStore`:
```tsx
// src/modules/connectors/ConnectorsViewer.tsx
import { useStore } from '../../core/emitter'
import { DocEditorPanel } from '../docEditor/docEditorModule'
import { ProposalStore } from '../../core/proposalStore'
import { ProposalApplier } from '../../core/proposalApplier'
import type { OpenDocsStore } from './openDocsStore'
import './connectors.css'

const proposals = new ProposalStore(() => 'connectors-viewer-noop')
const applier = new ProposalApplier(proposals)

export function ConnectorsViewer({ open }: { open: OpenDocsStore }) {
  const { tabs, activePath } = useStore(open)
  const active = open.activeDoc()
  return (
    <div className="connectors-viewer">
      <div className="connectors-viewer__tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.path}
            type="button"
            role="tab"
            aria-selected={t.path === activePath}
            className={`connectors-tab${t.path === activePath ? ' connectors-tab--active' : ''}`}
            onClick={() => open.activate(t.path)}
          >
            {t.name}{t.dirty ? ' •' : ''}
            <span
              className="connectors-tab__close"
              aria-label={`close ${t.name}`}
              onClick={(e) => {
                e.stopPropagation()
                if (t.dirty && !window.confirm('Discard unsaved changes?')) return
                open.close(t.path)
              }}
            >✕</span>
          </button>
        ))}
        {tabs.length === 0 && <span className="connectors-viewer__empty">No file open</span>}
      </div>
      {active && (
        <div className="connectors-viewer__body">
          <SaveBar open={open} />
          <DocEditorPanel store={active.doc} proposals={proposals} applier={applier} />
        </div>
      )}
    </div>
  )
}

function SaveBar({ open }: { open: OpenDocsStore }) {
  const active = open.activeDoc()!
  const { dirty, status, error } = useStore(active.save)
  const hint = status === 'saving' ? 'Saving…' : status === 'error' ? `Save failed: ${error ?? ''}` : dirty ? 'Unsaved changes' : status === 'saved' ? 'Saved' : ''
  return (
    <div className="connectors-viewer__bar">
      <span className="connectors-viewer__status" data-status={status}>{hint}</span>
      <button type="button" className="connectors-viewer__save" disabled={!dirty || status === 'saving'} onClick={() => void active.save.save()}>Save</button>
    </div>
  )
}
```
Keep the existing `.connectors-viewer__bar/__status/__save` CSS that already exists. ADD new CSS to `src/modules/connectors/connectors.css` for the tab bar (use real tokens — grep `src/styles/` for the surface/border/text/accent token names):
```css
.connectors-viewer__tabs { display: flex; border-bottom: 1px solid var(--border); overflow-x: auto; }
.connectors-tab { display: flex; align-items: center; gap: 6px; padding: 4px 10px; border: none; border-right: 1px solid var(--border); background: transparent; color: var(--text-dim); cursor: pointer; white-space: nowrap; }
.connectors-tab--active { color: var(--text); border-bottom: 2px solid var(--accent); }
.connectors-tab__close { opacity: .5; }
.connectors-tab__close:hover { opacity: 1; }
.connectors-viewer__empty { padding: 6px 10px; color: var(--text-dim); }
```
(Verify `--border`, `--text`, `--text-dim`, `--accent` exist; substitute the closest real token names if not.)

### 5.2 — `src/modules/connectors/connectorsViewerModule.tsx`
Replace entire contents:
```tsx
import type { WorkspaceModule } from '../../core/types'
import type { OpenDocsStore } from './openDocsStore'
import { ConnectorsViewer } from './ConnectorsViewer'

export function createConnectorsViewerModule(open: OpenDocsStore): WorkspaceModule {
  return {
    id: 'connectors-viewer',
    title: 'Viewer',
    locality: 'LOCAL',
    tools: [],
    layoutHints: { defaultSize: 34, collapsible: false, minSize: 20 },
    render: () => <ConnectorsViewer open={open} />,
  }
}
```

### 5.3 — `src/modules/connectors/connectorsFs.ts`
REMOVE the `openFileIntoViewer` function entirely (its read+hydrate logic now lives in `OpenDocsStore.open`). Keep `basename` and `writeFileToDisk` and their imports. Remove the now-unused `DocEditorStore` import if it becomes unused.

### 5.4 — `src/modules/connectors/openInViewerTool.ts`
Change deps from `{ client; scratch }` to `{ open: OpenDocsStore }`; handler opens via the store and returns the opened file's content to the agent:
```tsx
import type { ToolDef } from '../../core/types'
import type { OpenDocsStore } from './openDocsStore'

export function createOpenInViewerTool(opts: { open: OpenDocsStore }): ToolDef {
  return {
    name: 'open_in_viewer',
    description:
      'Open a file from a connector into the viewer so the user can see it. Pass the file `path` ' +
      '(use the filesystem connector tools to find it first). The contents are loaded into the ' +
      'viewer pane and returned to you. This does not modify the file or the user\'s documents.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Path of the file to open.' } },
      required: ['path'],
    },
    permission: {
      kind: 'read',
      resource: 'connector:filesystem:open_in_viewer',
      locality: 'LOCAL',
      describe: (args: unknown) => `Open "${(args as { path?: string })?.path ?? 'file'}" in the viewer?`,
    },
    handler: async (a: { path: string }) => {
      await opts.open.open(a.path)
      const d = opts.open.activeDoc()
      return d && d.path === a.path
        ? { ok: true, name: d.name, text: d.doc.getState().text }
        : { ok: false, error: 'could not open file' }
    },
  }
}
```

### 5.5 — `src/features/connectors.ts`
Change the `viewer` dep from `scratch`+`save` to `open`. Edit `createConnectorsFeature`'s deps type: remove `scratch: DocEditorStore` and `save: ConnectorsSaveStore`; add `open: OpenDocsStore`. Change the viewer line to `const viewer = createConnectorsViewerModule(deps.open)`. Remove the now-unused `DocEditorStore` / `ConnectorsSaveStore` type imports. Add `import type { OpenDocsStore } from '../modules/connectors/openDocsStore'`. Leave everything else (tree, panel, chat, layout) unchanged.

### 5.6 — `src/app/services.ts` (connectors region, ~lines 339-372)
- Add import: `import { OpenDocsStore } from '../modules/connectors/openDocsStore'`.
- Replace the two lines that create `connectorsScratch` (`new DocEditorStore('No file open')`) and `connectorsSave` (`new ConnectorsSaveStore({...})`) with a single: `const openDocs = new OpenDocsStore(mcpClient)`.
- Update the open-in-viewer tool registration: `createOpenInViewerTool({ open: openDocs })`.
- In the `createConnectorsFeature({...})` call: replace `scratch: connectorsScratch, save: connectorsSave` with `open: openDocs`.
- Update `onOpenFile`: `onOpenFile: (path: string) => void openDocs.open(path)`.
- Remove now-unused imports: `ConnectorsSaveStore` (line ~52) and `openFileIntoViewer` (line ~54). Keep `DocEditorStore` import ONLY if still used elsewhere in the file (it is used by the notes/library doc store — check; if the only user was the connectors scratch, remove it).
- Note: `connectorsScratch`/`connectorsSave` are removed; make sure nothing else in services references them.

### 5.7 — Migrate the connectors tests to the tabs API
These existing tests reference the old scratch/save viewer API and WILL break — update them so the connectors suite is green:
- `src/modules/connectors/connectorsViewerModule.test.tsx` — update to `createConnectorsViewerModule(new OpenDocsStore(fakeClient))`.
- `src/modules/connectors/connectorsViewerSave.render.test.tsx` — re-express the Save-bar test via `OpenDocsStore` (open a file with a fake client, edit the active doc, assert the Save button enables).
- `src/modules/connectors/connectorsViewerClose.render.test.tsx` — re-express as a tab-close test (open two files, click a tab's close ✕, assert the tab is gone) OR fold into the new tabs test below and delete this file.
- `src/modules/connectors/openInViewerTool.test.ts` — update to `createOpenInViewerTool({ open })` and assert the handler opens a tab + returns `{ ok, name, text }`.
- `src/modules/connectors/connectors.render.test.tsx` — check whether it references the viewer's old API; update only if it breaks.
Use this fake client shape in tests:
```ts
const client = { call: async (_n: string, a: { path: string }) => ({ ok: true, text: '# ' + a.path }) } as unknown as import('../../core/mcp/mcpClient').McpClient
```

### 5.8 — ADD a new tabs render test
```tsx
// src/modules/connectors/connectorsViewerTabs.render.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OpenDocsStore } from './openDocsStore'
import { createConnectorsViewerModule } from './connectorsViewerModule'
import type { McpClient } from '../../core/mcp/mcpClient'

const client = { call: async () => ({ ok: true, text: '# Hello' }) } as unknown as McpClient

describe('connectors viewer tabs', () => {
  it('shows a tab per open file and switches active doc on click', async () => {
    const open = new OpenDocsStore(client)
    const mod = createConnectorsViewerModule(open)
    render(mod.render())
    await open.open('/a.md'); await open.open('/b.md')
    await waitFor(() => expect(screen.getByRole('tab', { name: /a\.md/ })).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: /b\.md/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /a\.md/ }))
    expect(open.getState().activePath).toBe('/a.md')
  })
})
```

## Verify
- `npm test -- connectors` → green (all migrated + new tests).
- `npm test` → green except the known pre-existing `slice.integration` failure (unrelated; do not try to fix it).
- `npx tsc -b --noEmit` → clean.

## Report
Note in your report: every file you changed, which old tests you migrated vs deleted, the token names you used for tab CSS, and whether `DocEditorStore` import was removed from services.ts or kept (and why).

## DO NOT
- Do NOT run git. Do NOT touch the `slice.integration` test. Do NOT add features beyond the tab bar + the rewiring (YAGNI). Do NOT change the connectors tree/panel/chat modules.
