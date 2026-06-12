import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

// In WSL2 the Windows host (where llama-server runs) is the default gateway, not
// localhost. Detect it so the dev proxy can reach the Windows-side llama-server.
// Override with LLAMA_TARGET=http://host:port if your setup differs.
function llamaTarget(): string {
  if (process.env.LLAMA_TARGET) return process.env.LLAMA_TARGET
  try {
    const gw = execSync("ip route show default | awk '{print $3; exit}'", { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
    if (gw) return `http://${gw}:5174`
  } catch {
    // not WSL / no `ip route` — fall back to localhost
  }
  return 'http://localhost:5174'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Browser calls same-origin `/llama/...`; Vite forwards to llama-server.
      // This sidesteps CORS and WSL localhost limitations in one move.
      '/llama': {
        target: llamaTarget(),
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/llama/, ''),
      },
      // Geocoding (Nominatim) + routing (OSRM) proxied same-origin: kills CORS and
      // lets us attach the policy-required User-Agent the browser strips. The throttle
      // still enforces Nominatim's absolute 1 req/sec limit — the proxy doesn't lift that.
      '/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/nominatim/, ''),
        // Generic UA (no personal info — privacy-first); override with NOMINATIM_UA.
        headers: { 'User-Agent': process.env.NOMINATIM_UA ?? 'agent-practice/1.0 (local AI workspace)' },
      },
      '/osrm': {
        target: 'https://router.project-osrm.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/osrm/, ''),
      },
    },
  },
})
