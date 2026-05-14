# leadge-bonus — project memory

## Deployment

- **Hosting**: Render (NOT Vercel — switched mid-migration).
- **Live URL**: https://interexy.onrender.com/
- **Previous service** (deprecated): `vika-task` / `srv-d7ob8dpo3t8c73f6lmsg`
- **App lives in**: `web/` (Next.js 16 root). The legacy `index.html` at the
  repo root is being phased out.

## Render config notes

- Service type: Web Service (Node).
- Root directory must be set to `web/` so build/start run there.
- Build command: `npm run build`
- Start command: `npm run start`
- Auto-deploy from `main` on push.
- Environment variables go in the Render dashboard, not committed:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `SESSION_SECRET`
  - `SECTION_LEADGEN_HASH`, `SECTION_PROJECTS_HASH`
- `NEXT_PUBLIC_APP_URL` is no longer required — `/logout` derives the
  origin from the incoming request, so the app is host-agnostic.

## Stack

- Next.js 16 (App Router, Turbopack), React 19.2, TypeScript strict
- Tailwind v4 + shadcn/ui (base-ui primitives)
- Supabase: server uses `service_role`, browser only `@supabase/ssr` for Realtime
- Auth: argon2id-hashed section passwords + iron-session cookie
- Theme: light/dark via next-themes (default dark)

## Repo layout

```
/                                  ← legacy index.html lives here until cutover
├── index.html                     ← legacy SPA (kept until DNS cutover)
├── scripts/                       ← Python ETL (one-shot data import)
└── web/                           ← Next.js app (canonical going forward)
```

## When working in this repo

- All new feature work goes in `web/`. Don't edit `index.html`.
- Passwords for sections are `leadgen2025` and `projects2025`, hashed in env.
- Service role key must NEVER appear in client-side code.
- Realtime subscriptions are wired but require the anon key to retain SELECT
  on the relevant tables (currently RLS is disabled — keep an eye if/when RLS
  gets enabled).
