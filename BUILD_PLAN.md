# Halloween 2026 — Costume Contest (Rebuild)

A ground-up rebuild of the costume-contest app for reuse at Halloween 2026.
Premium, frictionless, photography-forward. This Next.js app now lives at the
repo root; the legacy vanilla-HTML + Express app was removed (recoverable in
git history before commit `8f72b37`'s parent).

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
- **Write path.** Reads are public (anon key + RLS). Guest writes (entries,
  votes, reactions, photo upload) go through Next route handlers using the
  **anon key** — the Supabase MCP exposes no service-role secret, so safety
  that can't be bypassed lives in the DB: phase + self-vote **triggers** and
  the one-ballot-per-device **unique constraint**. Anon write policies are
  intentionally open (the accepted frictionless risk). The service-role path
  (`lib/supabase/admin.ts`) is reserved for admin features later.
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
| 2 | Vote gallery + costume detail + reactions | ✅ done |
| 3 | Party Mode `/live` (Realtime tallies + winner reveal) | ✅ done |
| 4 | Host `/admin` (phase control, moderation, reveal) | ✅ done |
| + | Karaoke, Past Parties, global nav, clear-entries | ✅ done |
| 5 | PWA + offline queue, image polish, dry-run | ▢ next |
| — | Deploy to Vercel (env vars + domain) | ▢ |
| — | QR-at-door tokens | ▢ later (optional) |

## Backend (provisioned + verified)

Supabase project **`halloween-contest-2026`** (ref `bmvhcfrxosgvdipdkomb`,
us-east-1, Nonfiction Agency org, $10/mo). Migrations `0001`–`0003` applied;
public `costumes` bucket created. Fully verified live (uploads, voting,
self-vote block, reactions, results ranking, Realtime, all admin actions).

The public Supabase URL + publishable key are committed as fallbacks in
`lib/supabase/env.ts` (safe — they ship to the browser and are RLS-protected),
so **the Vercel deploy is zero-config**. Override via `NEXT_PUBLIC_*` env vars.

To run locally: `npm run dev` (from the repo root).

## Deploy

The app is at the repo root, so Vercel builds it directly — `git push` to the
connected project auto-deploys. No env vars required (public fallbacks baked
in). If Vercel doesn't auto-detect the framework, set Framework Preset =
Next.js.

## Routes

- `/` landing · `/enter` costume entry · `/vote` gallery + detail + reactions
- `/karaoke` sign-up (≤2/device, live reorder notice) · `/past` memories gallery
- `/live` Party Mode (Realtime + reveal) · `/admin` host control room
- Global bottom nav across guest pages (hidden on `/enter`, `/live`, `/admin`)
- `GET /api/state` phase/settings/categories · `GET|POST /api/entries` list/create
- `GET /api/my?device_id=` this device's ballot · `POST|DELETE /api/vote` cast/clear
- `POST /api/react` toggle reaction · `GET /api/results` standings for `/live`
- `POST /api/admin` host actions (passcode-gated → SECURITY DEFINER RPCs)
- `GET|POST|DELETE /api/karaoke` queue · `GET|POST /api/memories` past-party photos
- `GET /api/memories/download?id=` save-to-device (Content-Disposition attachment)

## Host passcode

Admin (`/admin`) is gated by a passcode stored in the DB (`app_config`),
defaulting to **`boo-2026`**. Change it before the event:
`update app_config set value = 'your-passcode' where key = 'admin_passcode';`
