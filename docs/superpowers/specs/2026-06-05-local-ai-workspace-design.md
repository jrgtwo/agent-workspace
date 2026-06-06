# Local Privacy-First AI Workspace — Design Spec

**Date:** 2026-06-05
**Status:** Approved design → ready for implementation planning

---

## Context

This is an exploratory project that should grow into a real product. The goal is to
understand what a local AI agent can do when it is woven into the tools a person uses
every day — not as a chat box you visit, but as an ambient collaborator that lives
inside your workspace.

The driving constraint is **privacy**. The product's reason to exist is that users can
safely share personal information with an AI because nothing ever leaves their machine.
There is no cloud, no telemetry, no third party who could sell or leak that data. Every
architectural decision serves that guarantee. Local inference (llama.cpp) and on-device
storage are not implementation details — they are the product.

We build in web technologies now (fast iteration, familiar stack) with the intent to
ship as a native desktop app later via a Tauri wrapper, which can eventually bundle and
manage the llama.cpp binary itself.

## Product thesis

A **user-first, multi-panel AI workspace**. The user drives standalone feature
mini-apps (Notes first; Search, Tasks, and more later). A tool-using agent is present
*within* features as an ambient helper: it has holistic context of what the user is
doing, asks permission before reading or writing a feature's data, and persists useful
information from interactions so it learns the user's tendencies over time — making both
the user and the agent more efficient.

## Locked-in decisions

| Area | Decision |
| --- | --- |
| Experience model | User-first workspace; agent is an ambient, permissioned helper |
| Layout | Tiled multi-panel; left rail = feature menu; each feature **declares** its own panel layout and which layout controls (collapse/resize) are enabled |
| Composition | A **module library** of reusable panels; a **feature** = a layout that composes modules |
| Local inference | `llama.cpp` `llama-server` — OpenAI-compatible HTTP API on localhost, streaming + tool-calling |
| Frontend | React + TypeScript + Vite |
| Native (later) | Tauri wrapper (not Electron) |
| Privacy UX | Every panel/module is tagged `LOCAL` or `NETWORK`; a single Permission/Privacy Broker gates all data access |
| First build | A fully-local Notes vertical slice (details below) |

## Architecture

Five layers, top to bottom. Each layer depends only on the layer below it through a
well-defined interface.

1. **Workspace Shell** — the feature menu (left rail) and the tiled panel area. The
   panel area renders the active feature's declared layout (split / stack / resize /
   collapse, as the feature permits).

2. **Features (declarative)** — e.g. Notes, Search. A feature is data, not bespoke
   chrome: a layout manifest + a chosen set of modules + the wiring between them.
   Adding a feature = pick modules and declare a layout.

3. **Module Library (reusable)** — AI Chat, AI Search, Doc Editor, Permission Prompt,
   Memory Viewer, and more over time. Each module declares three things:
   - its **UI** (the panel it renders),
   - the **tools** it exposes to the agent (e.g. Doc Editor exposes `read_document`,
     `apply_edit`),
   - the **data and permissions** it needs.
   Build a module once → reuse it across old and new features.

4. **Core Services** — built once, used by every module:
   - **Agent Engine** — the agent loop, the tool registry, and the streaming client to
     `llama-server`.
   - **Permission / Privacy Broker** — the single chokepoint every read/write flows
     through; enforces allow/deny and tracks each operation's LOCAL vs NETWORK nature.
   - **Memory Store** — persists learned tendencies; fully user-inspectable and editable.
   - **Registry** — knows all modules, features, and the tools each module contributes.

5. **Local Infrastructure** — `llama.cpp` `llama-server` on localhost and on-device
   storage for notes, memory, and settings. Everything `LOCAL`.

### Why this shape

The hard parts (agent loop, permission enforcement, memory) live once in the core. The
permission broker being a *single chokepoint* is what keeps the privacy guarantee
honest — no module can touch data or the network without going through it. Features
become cheap to add, which directly serves the "more features as we go" goal.

## Module contract (the key interface)

Every module implements the same contract so the shell and agent can treat them
uniformly:

- **render(panelProps)** → the module's UI.
- **tools** → a list of agent-callable tools, each with a JSON schema and a handler. The
  Registry collects these so the Agent Engine can offer them to the model.
- **permissions** → declared data scopes and whether the module is LOCAL or NETWORK.
- **layout hints** → default size, collapsible?, resizable?, min/max — which the feature
  manifest can override.

A **feature manifest** then declares: ordered list of module instances, the tiling
layout, and per-panel layout-control overrides.

## First vertical slice — Fully-local Notes

**Goal:** prove the entire architecture end-to-end with zero privacy risk (no network).

**Composed modules:** Doc Editor (`LOCAL`) + AI Chat (`LOCAL`, talks to llama-server) +
Permission Prompt + a basic Memory Store/Viewer.

**Layout:** matches the approved Notes mockup minus the deferred Search panel — AI Chat
panel on the **left** (collapsible), Doc Editor on the **right** (primary, full height).

**The canonical scenario it must support:**
1. User is writing in the Doc Editor.
2. User asks the AI Chat for help (e.g. "tighten this intro").
3. Agent requests permission to **read** the document → Permission Prompt → user allows.
4. Agent reads the doc (via the Doc Editor's `read_document` tool), responds with help,
   and may request permission to **write/apply an edit** → user allows or denies.
5. A useful takeaway from the interaction is **saved to the Memory Store** (e.g. a style
   preference), visible and editable in the Memory Viewer.

**Explicitly deferred from this slice:** AI Search and anything `NETWORK`, additional
features (Search/Tasks), the Tauri wrapper, multi-document management beyond the minimum.

### Data flow (slice)
`AI Chat input → Agent Engine → llama-server (stream) → tool call (e.g. read_document)
→ Permission Broker (allow/deny) → Doc Editor tool handler → result back to Agent Engine
→ streamed response in AI Chat → optional memory write → Memory Store`.

## Privacy design

- **Default deny / explicit allow** for any data access; the agent must request, the user
  must grant. Permission scope is shown in plain language ("Read Untitled.md?").
- **Visible boundaries** — every panel carries a `LOCAL`/`NETWORK` badge so the user
  always sees where data could go. The slice is 100% `LOCAL`.
- **Inspectable memory** — the user can see, edit, and delete everything the agent has
  learned. Nothing is hidden.
- **On-device only** — notes, memory, and settings persist locally; the only outbound
  connection in the whole system is to `localhost` llama-server (not the internet).

## Error handling

- **llama-server unreachable / not running** — the AI Chat surfaces a clear, calm state
  ("Local model not running") with guidance, never a silent hang. The rest of the
  workspace (editing, etc.) keeps working.
- **Model returns malformed tool call** — Agent Engine validates against the tool's
  schema; on mismatch it asks the model to retry rather than executing.
- **Permission denied** — the agent acknowledges and continues without the data; the
  action simply does not happen.
- **Streaming interruption** — partial responses are preserved; the user can retry.

## Testing approach

- **Module contracts** — unit-test each module's tools (schema validation, handler
  behavior) and its permission declarations in isolation.
- **Permission Broker** — unit tests proving no data access path bypasses it; default-deny
  is enforced; LOCAL/NETWORK classification is correct.
- **Agent Engine** — test the loop against a mocked llama-server (deterministic tool-call
  fixtures): tool dispatch, schema-retry on malformed calls, streaming assembly.
- **Memory Store** — round-trip persistence; user edit/delete.
- **Slice integration** — drive the canonical scenario end-to-end against a real local
  `llama-server` and assert: permission prompt appears, read happens only after allow,
  edit happens only after allow, a memory entry is written and visible.

## Roadmap after the slice

1. AI Search module + first `NETWORK` boundary handling.
2. Additional features (Search, Tasks) — should be cheap given the module model.
3. Richer memory/learning (surfacing tendencies proactively).
4. Tauri wrapper; bundle/manage the llama.cpp binary.
