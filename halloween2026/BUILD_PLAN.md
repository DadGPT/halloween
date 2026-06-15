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
| 3 | Party Mode `/live` (Realtime tallies + winner reveal) | ▢ next |
| 4 | Host `/admin` (phase control, moderation, reveal) | ▢ |
| 5 | PWA + offline queue, image polish, dry-run | ▢ |
| — | QR-at-door tokens | ▢ later (optional) |

## Backend (provisioned + verified)

Supabase project **`halloween-contest-2026`** (ref `bmvhcfrxosgvdipdkomb`,
us-east-1, Nonfiction Agency org, $10/mo). Migrations `0001` + `0002` applied;
public `costumes` bucket created. Verified live: `/api/state` reads the DB,
`POST /api/entries` uploads to Storage + inserts, photo is publicly readable,
and the phase trigger blocks votes during preshow. `.env.local` holds the
project URL + publishable key (gitignored).

To run locally: `npm run dev` (from `halloween2026/`).

## Routes

- `/` landing · `/enter` costume entry · `/vote` gallery (placeholder)
- `/live` Party Mode (placeholder) · `/admin` host (placeholder)
- `GET /api/state` phase/settings/categories · `GET|POST /api/entries` list/create
- `GET /api/my?device_id=` this device's ballot · `POST|DELETE /api/vote` cast/clear
- `POST /api/react` toggle reaction
