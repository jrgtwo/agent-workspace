# Composable Views — progress ledger

Plan: docs/superpowers/plans/2026-06-19-composable-views.md
Branch policy: on main (user consent); user runs all commits; controller uses read-only git only.
Commit cadence: batch per phase boundary (P1 = T1-3).

- Task 1 (panel registry): complete, review clean. Files: src/core/panelRegistry.ts(+.test.tsx). UNCOMMITTED.
- Task 2 (resolveView): complete, review clean. Files: src/modules/views/resolveView.ts(+.test.tsx). UNCOMMITTED.
  - MINOR (defer to final review): no explicit dedup test for modulesForLayout (a layout with the same moduleId twice → module once). Logic is correct; test gap only.
- Task 3 (ViewsStore): complete, review clean. Files: src/modules/views/viewsStore.ts(+.test.ts). Storage import path corrected to ../../core/storage/storage. UNCOMMITTED.
  - MINOR (defer to final review): duplicateView returns source id on unknown id (defensible no-op; consider undefined/throw or a comment).
- PHASE 1 COMPLETE (T1-T3). User commit prompted.
- Task 4 (OpenDocsStore): complete, review clean. Files: src/modules/connectors/openDocsStore.ts(+.test.ts). UNCOMMITTED.
  - MINORs (defer to final review): (a) open() concurrent-same-path race (UI serializes, low risk); (b) no test for closing an inactive tab; (c) read failure (r.ok=false) returns silently with no error signal.
- Task 5 (tabbed viewer + connectors rewire): complete, review clean. 10 files (ConnectorsViewer rewrite, connectorsViewerModule(open), openInViewerTool({open}), connectorsFs (removed openFileIntoViewer), features/connectors.ts, services.ts, 4 migrated tests + 1 new tabs test). Full suite 524/525 (pre-existing fail only), tsc clean. CSS token: --text-muted. UNCOMMITTED.
  - MINOR (fix in final-review sweep T10): orphaned CSS rules in connectors.css — .connectors-viewer__name, .connectors-viewer__close, .connectors-viewer__close:hover (dead after rewrite).
- PHASE 2 COMPLETE (T4-T5). User commit prompted. (Per-task diffs from here scoped with `git diff -- <files>`.)
- Task 6 (LayoutStore add/remove): complete, review clean after 1 fix. addPanel/removePanelById in src/core/layoutStore.ts + 5 tests (12/12). Fixed Important: phantom-notify guard for absent id on remove (+ regression test); moved test imports to top. tsc clean. UNCOMMITTED.
- PHASE 3 COMPLETE (T6).
- ORDER CHANGE: doing Task 8 (PanelArea onRemovePanel) BEFORE Task 7 (ViewArea), because ViewArea passes onRemovePanel to PanelArea (must exist first for tsc).
- Task 8 (PanelArea remove control): complete, review clean. onRemovePanel? threaded; ✕ button when draggable&&onRemove; --text-muted/--text tokens. panelAreaRemove 1/1, PanelArea 3/3, tsc clean. UNCOMMITTED.
  - MINORs (defer): redundant margin-left on .panel-frame__remove (cosmetic); single-panel branch threading untested.
- Task 7 (ViewArea + AddPanelMenu): complete, review clean. 4 new files (ViewArea.tsx, AddPanelMenu.tsx, views.css, ViewArea.render.test.tsx). All 6 CSS tokens real. 1/1 test, tsc clean. UNCOMMITTED.
  - MINORs (defer): add-menu has no outside-click/keyboard dismiss (a11y follow-up); manifest.layout passed to PanelArea is decorative (PanelArea reads the store itself) — pre-existing quirk.
- PHASE 3 COMPLETE (T6). Phase 4 in progress: T8 done, T7 done. Remaining: T9 (split into 9a services + 9b shell).
- NOTE for T9a: registry keys MUST equal each module's `.id`. Memory module's real id discovered. Default views only use 3 known ids; memory registry-only.
- Task 9a (services registry+ViewsStore): complete, review clean (no issues). defaultViews.ts; services.ts wires registry (reusing connectorsFeature.modules + memoryModule) + ViewsStore + persist scope 'views' + AppServices. services.views test. 532 pass/1 known fail. UNCOMMITTED.
- Task 9b (shell+rail+App): complete, review clean. WorkspaceShell branches Legacy/Composable (optional props); FeatureRail Views section (aria-label); per-view LayoutStore ref→viewsStore.updateLayout; App passes props. workspaceShellViews test green; existing shell/board green; tsc clean. UNCOMMITTED.
  - MINORs (defer/final): new-view default panel hardcoded connectors-tree (per spec); ViewsStore.activeId unused by shell (reload lands on first feature, not last view) — v1-acceptable.
- ALL IMPLEMENTATION TASKS T1-T9 COMPLETE.
- Task 10 (final): whole-branch review (opus) done — found 2 Important regressions missed by per-task reviews: (1) opened files showed spurious "unsaved changes" (dropped Milkdown rebaseline) — FIXED (rebaseline re-wired in OpenDocsStore.open + regression test); (2) double reset control in views — FIXED (PanelArea showReset prop, ViewArea passes false). Orphaned connectors.css rules deleted. Final suite: 534 pass / 1 pre-existing fail; tsc clean. Docs updated (current-status, current-tasks, STATUS.md).
- DEFERRED follow-ups (non-blocking, logged in STATUS): multi-instance panels; Kanban/Map in registry; unify viewer w/ Notes library; persist open tabs; AddPanelMenu outside-click dismiss; ViewsStore.activeId wired to shell; modulesForLayout dedup test; surface tree open read-failures.
- FEATURE COMPLETE — pending user git commit + Windows-browser E2E.
