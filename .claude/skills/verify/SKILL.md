---
name: verify
description: How to build, run, and visually verify frontend changes in this repo
---

# Verifying frontend changes

## Build check
`cd frontend && npm run build` — fast (~300ms with vite), catches JSX/CSS errors.

## Visual verification (screenshots)
- The Vite dev server often already runs on port 5173 (user's session). Check with
  `lsof -i :5173 -sTCP:LISTEN` before starting your own (`npm run dev`); `strictPort` is set,
  so a second instance fails. HMR means the running server already serves your edits.
- Laravel backend is proxied at `/api` → localhost:8000 (see `frontend/vite.config.js`).
- Playwright 1.61 is cached at `/Users/walididrissi/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`
  with Chromium in `~/Library/Caches/ms-playwright`. Import it by absolute path in a
  scratchpad `.mjs` script: `import { chromium } from '<that path>/index.mjs'`.
- To hold a loading state on screen, stall its API call with
  `page.route('**/api/auth/**', () => {})` before `goto`. Auth check is `GET /api/auth/me`
  (ProtectedRoute shows the loader while it's pending).
- Gotcha: never stall `**/api/**` — it also matches Vite module URLs like `/src/api/axios.js`
  and blocks the whole app from loading (DOMContentLoaded never fires).
- Useful surfaces: `/dashboard` (protected, provider), `/completer-expedition/:token`
  (public, shows loading state while `GET /api/expedition-requests/complete/:token` pends).
- To get past auth without a backend, fulfill `/api/auth/me` with
  `{ user: { id, name, role } }` — roles are `prestataire`, `client`, `employe` (must match
  the route's ProtectedRoute role). Stall other `/api/*` paths to hold page loading states.
  Route-match with a function on `url.pathname.startsWith('/api/')`, never glob `**/api/**`.
- Zoom into a screenshot with `sips -c <h> <w> in.png --out out.png` (center crop).
