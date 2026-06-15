# 🎃 Halloween Costume Contest

A premium, frictionless, mobile-first costume-contest app for a live party:
guests enter their costume from their phone, vote across categories, react to
each other's looks, and the winners are crowned live on a big screen.

Built with **Next.js 16** (App Router) · **React 19** · **Tailwind v4** ·
**Supabase** (Postgres + Storage + Realtime) · **motion**. Deploys to Vercel.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
```

No env vars needed to run — the public Supabase URL + publishable key are baked
in as fallbacks (`lib/supabase/env.ts`). To point at your own project, set
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see
`.env.local.example`) and run the SQL in `supabase/migrations/`.

## Routes

| Route    | What it is                                                        |
| -------- | ----------------------------------------------------------------- |
| `/`      | Landing                                                           |
| `/enter` | Camera-first costume submission (client-compressed → Storage)     |
| `/vote`  | Costume gallery + detail, emoji reactions, one-pick-per-category  |
| `/live`  | **Party Mode** — big-screen Realtime leaderboard + winner reveal  |
| `/admin` | Host control room (passcode) — phase, reveal, moderation          |

## How it works

- **Frictionless identity** — no login; a device id ties votes/entries to a
  device. Hardened by DB triggers (phase + self-vote) and a one-ballot-per-
  device constraint, not by login.
- **Phases** — `preshow → voting → closed`, driven by the host from `/admin`.
- **Host actions** are passcode-gated `SECURITY DEFINER` RPCs (no service-role
  key needed). Default passcode `boo-2026` — change it before the event:
  `update app_config set value = '…' where key = 'admin_passcode';`

See `BUILD_PLAN.md` for architecture, design language, and status.
