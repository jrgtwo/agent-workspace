# Task 9a Report: Panel registry + ViewsStore wired into services.ts

## Status: COMPLETE

## Files changed
- **Created** `src/modules/views/defaultViews.ts` — `DEFAULT_VIEWS: ViewDef[]` (editor + reader, verbatim from brief).
- **Modified** `src/app/services.ts` — imports, AppServices interface, registry/viewsStore block, return object.
- **Created** `src/app/services.views.test.ts` — wiring test.

## Exact services.ts edit locations
1. **Imports** (after the `createConnectorsFeature` import, ~line 55): added
   ```ts
   import { buildRegistry, type PanelType, type PanelRegistry } from '../core/panelRegistry'
   import { ViewsStore } from '../modules/views/viewsStore'
   import { DEFAULT_VIEWS } from '../modules/views/defaultViews'
   ```
2. **AppServices interface** (after `mcp: McpStore`, ~line 186): added `registry: PanelRegistry` and `viewsStore: ViewsStore`.
3. **Registry/viewsStore block**: placed immediately AFTER the `const connectorsFeature = createConnectorsFeature({...})` call (which closes ~line 369) and BEFORE the `// Orchestrator:` comment block. Both `memoryModule` (defined ~line 317) and `connectorsFeature` are in scope at this point — confirmed by reading. Block reuses `connectorsFeature.modules` (no new module instances created).
4. **Return object** (final `return { ... }`): appended `registry: panelRegistry, viewsStore`.

## Memory module id used
Not hardcoded — used `memoryModule.id` as the registry key, per brief.

## connectorsFeature.modules ids (verified in src/features/connectors.ts)
`[filetree, panel, chat, viewer]` → ids `connectors-tree`, `connectors-panel`, `ai-chat`, `connectors-viewer`. Registry registers `connectors-tree`, `connectors-viewer`, `ai-chat`, plus memory. (`connectors-panel` intentionally not added — not in DEFAULT_VIEWS and not requested by brief.)

## CreateServicesOpts option names used in test
`CreateServicesOpts = { client?, backend?, mcpClient? }`. Test injects `{ client: fakeClient, backend: new MemoryBackend(), mcpClient: fakeMcp }`, matching the existing `src/app/mcpServices.test.ts` shape. `mcpClient` fake is `{ listTools: vi.fn().mockResolvedValue([]), call: vi.fn() }` — no `as never` cast needed since it satisfies `Pick<McpClient, 'listTools' | 'call'>`.

## Test output
- `npm test -- services.views` → PASS (1 file, 1 test).
- `npx tsc -b --noEmit` → clean (no output).
- `npm test` → 132 passed | 1 failed (533 tests: 532 passed, 1 failed). The single failure is the known pre-existing `src/app/slice.integration.test.tsx:61` (untouched, per brief).

## Concerns
- None blocking. The new wiring is dormant — nothing consumes `registry`/`viewsStore` until Task 9b (shell/rail). Build + all tests (minus the known slice.integration failure) are green.
- The brief's test template used `mcpClient: fakeMcp as never`; I dropped the cast since the fake structurally satisfies the option type. Behaviorally identical.
