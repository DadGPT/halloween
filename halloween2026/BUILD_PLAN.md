# Halloween 2026 — Costume Contest (Rebuild)

A ground-up rebuild of the costume-contest app for reuse at Halloween 2026.
Premium, frictionless, photography-forward. Replaces the legacy vanilla-HTML +
Express app in the repo root.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind v4** design system (see `app/globals.css`)
- **Supabase**: Postgres + Storage + Realtime (anon reads, service-role writes)
- **motion** (animation), **lucide-react** (icons), **browser-image-compression**
- Deploys to **Vercel**

## Architecture decisions

- **Frictionless identity (no login).** A client-generated `device_id`
  (`lib/device.ts`) ties entries/votes/reactions to a device. Not a security
  boundary — hardened with one-ballot-per-device (DB unique constraint),
  self-vote block + phase gating (DB triggers), and Vercel BotID (later).
- **One write path.** The browser uses the anon key for public reads and
  Realtime only. ALL writes go through Next route handlers using the
  service-role key, so device rules live in one place. RLS = public read,
  no anon writes.
- **Phase** (`preshow` → `voting` → `closed`) comes from `contest_settings`
  via the `current_phase()` SQL function; `/api/state` exposes it to clients.

## Design language

- Warm near-black base (`night-*`), single **ember** accent, **gold reserved
  for awards only**, warm off-white text (never pure white).
- **Fraunces** (display) + **Geist** (body). Film grain + soft vignette.
- Restrained motion; big tap targets; legible at all ages.

## Status

| Phase | Item | State |
| ----- | ---- | ----- |
| 0 | Scaffold, design system, data layer, schema | ✅ done |
| 0 | Landing page | ✅ done |
| 1 | Costume entry (camera-first, compress, upload) | ✅ done |
| 2 | Vote gallery (swipe-to-vote) + reactions | ▢ next |
| 3 | Party Mode `/live` (Realtime tallies + winner reveal) | ▢ |
| 4 | Host `/admin` (phase control, moderation, reveal) | ▢ |
| 5 | PWA + offline queue, image polish, dry-run | ▢ |
| — | QR-at-door tokens | ▢ later (optional) |

## Setup (to run locally)

1. Create a Supabase project; run `supabase/migrations/0001_init.sql`.
2. Create a **public** Storage bucket named `costumes`.
3. Copy `.env.local.example` → `.env.local`, fill in URL + anon + service-role keys.
4. `npm run dev`.

> Supabase project is not yet provisioned — that's a billable external step
> awaiting the go-ahead. The app compiles without it; it needs the env vars to run.

## Routes

- `/` landing · `/enter` costume entry · `/vote` gallery (placeholder)
- `/live` Party Mode (placeholder) · `/admin` host (placeholder)
- `GET /api/state` phase + settings + categories · `POST /api/entries` create entry
