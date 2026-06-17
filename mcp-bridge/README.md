# MCP bridge (Phase 1)
A tiny local bridge so the browser app can use MCP connectors. It launches the official
filesystem MCP server over stdio and exposes it over HTTP for the app (Vite proxies /mcp -> here).

## Run
    npm install        # once, to get @modelcontextprotocol/sdk
    npm run mcp-bridge # starts the bridge on http://localhost:5175

Env:
- MCP_BRIDGE_PORT (default 5175) — must match the Vite /mcp proxy target.
- MCP_FS_DIR (default ./mcp-sandbox) — the ONLY directory the filesystem connector may access.

The first run downloads @modelcontextprotocol/server-filesystem via npx (needs network once).
Start this BEFORE (or refresh in-app after) opening the Connectors feature.
