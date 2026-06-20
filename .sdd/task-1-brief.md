# Task 1: Panel registry

Part of the "Composable Views (v1)" feature. This is the first, foundational task: a tiny registry
that maps panel-type ids → singleton `WorkspaceModule`s. Later tasks (resolveView, ViewsStore) build
on it.

## Global Constraints (bind every task)
- tsconfig `erasableSyntaxOnly: true` → NO TS constructor parameter properties (`constructor(private x)`). Declare explicit class fields, assign in the body.
- Stores extend `Emitter<TState>` (`src/core/emitter.ts`): private `state`, `getState = () => this.state`, replace state then `this.notify()`. (Not relevant to this task, but the house style.)
- Match existing code style. No raw hex colors in CSS (not relevant here).
- Tests run under Vitest in jsdom. The repo runs `.tsx` test files fine; use `.tsx` if the test contains JSX.

## Files
- Create: `src/core/panelRegistry.ts`
- Test: `src/core/panelRegistry.test.tsx`

## Interfaces this task PRODUCES (later tasks rely on these exact names)
- `interface PanelType { id: string; label: string; icon: string; module: WorkspaceModule }`
- `type PanelRegistry = Map<string, PanelType>`
- `function buildRegistry(types: PanelType[]): PanelRegistry`

`WorkspaceModule` is imported from `src/core/types.ts` (existing). Its shape:
`{ id: string; title: string; locality: 'LOCAL'|'NETWORK'; tools: ToolDef[]; render: () => JSX.Element; layoutHints?: {...} }`.

## TDD steps

### Step 1: Write the failing test
```tsx
// src/core/panelRegistry.test.tsx
import { describe, it, expect } from 'vitest'
import { buildRegistry, type PanelType } from './panelRegistry'
import type { WorkspaceModule } from './types'

const mod = (id: string): WorkspaceModule => ({ id, title: id, locality: 'LOCAL', tools: [], render: () => <div /> })

describe('buildRegistry', () => {
  it('indexes panel types by id', () => {
    const t: PanelType = { id: 'file-tree', label: 'File tree', icon: '📁', module: mod('file-tree') }
    const reg = buildRegistry([t])
    expect(reg.get('file-tree')).toBe(t)
    expect(reg.get('nope')).toBeUndefined()
  })
})
```

### Step 2: Run the test, verify it FAILS
`npm test -- panelRegistry` → FAIL ("buildRegistry is not a function" / module not found).

### Step 3: Write the implementation
```ts
// src/core/panelRegistry.ts
import type { WorkspaceModule } from './types'

export interface PanelType {
  id: string
  label: string
  icon: string
  module: WorkspaceModule
}
export type PanelRegistry = Map<string, PanelType>

export function buildRegistry(types: PanelType[]): PanelRegistry {
  return new Map(types.map((t) => [t.id, t]))
}
```

### Step 4: Run the test, verify it PASSES
`npm test -- panelRegistry` → PASS.

### Step 5: Typecheck
`npx tsc -b --noEmit` → clean (no new errors).

## DO NOT
- Do NOT run any git command (no add/commit/branch/status). The human owns all git. Leave changes uncommitted in the working tree.
- Do NOT add anything beyond what's specified (YAGNI).
