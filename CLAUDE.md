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
  - `ALLOWED_DOMAINS` — comma-separated list of allowed email suffixes
    (e.g. `interexy.com`). Emails matching one of these can sign in even
    if not listed in the `allowed_users` table.
- `NEXT_PUBLIC_APP_URL` is no longer required — `/logout` derives the
  origin from the incoming request, so the app is host-agnostic.

## Stack

- Next.js 16 (App Router, Turbopack), React 19.2, TypeScript strict
- Tailwind v4 + shadcn/ui (base-ui primitives)
- Supabase: server uses `service_role` (bypasses RLS) plus `@supabase/ssr`
  server client for the user session; browser uses `@supabase/ssr` for both
  auth and Realtime
- Auth: Supabase Auth email OTP (6-digit, 10-min expiry). Access is gated by
  a whitelist: `ALLOWED_DOMAINS` env suffix OR row in `allowed_users` table.
  SMTP is Resend, configured in the Supabase dashboard (not in app env);
  sender is `onboarding@resend.dev` until `interexy.com` is DNS-verified.
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
- To let a non-`@interexy.com` email sign in, insert a row into
  `allowed_users` (Supabase MCP or SQL).
- Service role key must NEVER appear in client-side code.
- **RLS is ON for every `public` table**. Server code uses the service_role
  client (bypasses RLS) — writes and unrestricted reads work as before.
  For Realtime `postgres_changes` in the browser, tables need a SELECT
  policy for the `authenticated` role. Currently that's set on
  `projects`, `project_members`, `project_events`, `developer_status`.
  If a new table needs Realtime, add an `authenticated_read` policy in
  the same shape (`FOR SELECT TO authenticated USING (true)`).
- Legacy Leadgen UI was removed (tag `leadgen-v1` marks the last commit with
  it). DB tables `deals`, `funnel_calc`, etc. are untouched.
