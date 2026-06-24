# MCP bridge (multi-server)
A tiny local bridge so the browser app can use MCP connectors. It launches multiple MCP servers
over stdio and exposes them over HTTP for the app (Vite proxies /mcp -> here).

## Run
    npm install        # once, to get @modelcontextprotocol/sdk
    npm run mcp-bridge # starts the bridge on http://localhost:5175

Env:
- MCP_BRIDGE_PORT (default 5175) — must match the Vite /mcp proxy target.
- MCP_FS_DIR (default ./mcp-sandbox) — the ONLY directory the filesystem connector may access;
  also used as the working directory for the pandoc server.

Start this BEFORE (or refresh in-app after) opening the Connectors feature.

## Adding more connectors

The bridge hosts a `SERVERS` list in `server.mjs`. Each entry is `{ id, command, args, cwd? }`.
The bridge connects all servers on startup, aggregates their tools, and routes `/call` requests
by tool name. To expose another connector, add an entry to `SERVERS` and restart the bridge.

```js
// Example — add a sqlite connector
{ id: 'sqlite', command: 'uvx', args: ['mcp-server-sqlite', '--db-path', '/path/to/db.sqlite'] }
```

The first run downloads each package (via `npx`/`uvx`) when needed — network required once per
package; subsequent starts are offline.

## Connectors included

### filesystem
Powered by `@modelcontextprotocol/server-filesystem`. The server enforces a strict root — it
**cannot** read or write outside `MCP_FS_DIR` (the sandbox). This is the primary connector the
agent uses to open, edit, and create files.

### pandoc (document conversion)
Powered by `uvx mcp-pandoc`. Converts documents between formats (Markdown ↔ DOCX, HTML, etc.).
The agent can use this to convert files it has already placed in the sandbox.

**This connector is not self-sandboxed.** Unlike the filesystem server, `mcp-pandoc` has no
built-in path restriction. The bridge launches it with `cwd` set to the sandbox directory, and the
agent is steered via its system prompt to operate only on sandbox paths, but the process itself
can read or write any path the bridge process can reach. Everything stays fully local — no network
egress — but treat `mcp-pandoc` as "agent-mediated, cwd-anchored" rather than "hard-sandboxed."

## Prerequisites

| Requirement | Purpose | Install |
|---|---|---|
| **Node ≥ 18** | Runs this bridge | comes with `npm run mcp-bridge` |
| **`npx`** (bundled with Node) | Downloads/runs the filesystem server | — |
| **`uv` / Python** | Runs `uvx mcp-pandoc` | `brew install uv` / `pip install uv` / [astral.sh/uv](https://github.com/astral-sh/uv) |
| **Pandoc binary** | Actual conversion engine (`mcp-pandoc` shells out to it) | `brew install pandoc` / `apt-get install pandoc` / [pandoc.org/installing](https://pandoc.org/installing.html) |
| **TeX Live** *(optional)* | PDF export only (not needed for DOCX / HTML) | `brew install texlive` / `apt-get install texlive-full` |

## Non-fatal failures

A server that fails to launch (missing `pandoc`, `uv` not found, etc.) is logged and **skipped**;
the bridge keeps running with the remaining servers. You will see a line like:

    [mcp-bridge] could not launch "pandoc" (uvx): ... — skipping

and the filesystem connector continues to work as before. The bridge only exits if **zero** servers
connect successfully.
