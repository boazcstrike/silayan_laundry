# Project Context — Silayan Laundry

> Entry point for collaboration is `AGENTS.md`. This file is the detailed project context it
> points to. For code-quality/refactoring priorities see `TODO.md`.

## Overview

Next.js (App Router) app for tracking laundry item counts and generating a formatted image with
the counts overlaid on a template. Submissions can be downloaded or sent to Discord, and every
submission is recorded for the **analytics dashboard** (`/analytics`).

## Architecture at a glance

```
app/
  page.tsx                     # counter (LaundryCounter)
  analytics/page.tsx           # analytics dashboard (reads /api/analytics)
  history/page.tsx             # submission history (paginated, with prefill forecast)
  api/
    submissions/route.ts       # POST record + GET summary/recent/channel-stats + history with pagination
    analytics/route.ts         # GET assembled dashboard payload + forecasts
    discord/route.ts           # proxy image upload to Discord webhook
components/
  LaundryCounter/              # counter UI (extracted, focused components)
  history/                     # submission history list + ForecastPrefillCard
  AppShell / AppSidebar        # navigation shell (includes /history link)
  ui/                          # shadcn-style primitives (Base UI + Radix)
hooks/                         # useSubmission, useLaundryItems, useImageGeneration, useDiscordUpload
  usePrefillCounts.ts          # mount-only: parse & apply prefill param, strip URL after
lib/
  services/AnalyticsDB.ts      # SQLite (better-sqlite3) — original data class
  services/analytics/          # store abstraction + MongoDB dual-write  ← see docs/data-layer.md
  prefill.ts                   # encode/decode base64url prefill params; split known/custom
  laundryForecast.ts           # EWMA cadence forecast
  laundryLoadForecast.ts       # per-category load forecast
  types/                       # shared TypeScript interfaces
```

## Data layer (important)

Submissions are **dual-written to SQLite + MongoDB**. MongoDB is the analytics source of truth;
SQLite is the local copy and read fallback. Discord/download sends are both treated as submissions.

**Read the full reference: [`docs/data-layer.md`](docs/data-layer.md).** Key points:

- Routes depend on `getAnalyticsStore()` (`lib/services/analytics/index.ts`), never a concrete backend.
- Writes: SQLite first (generates id), then Mongo (failure logged + swallowed).
- Reads: Mongo-first, SQLite fallback. No `MONGODB_URI` → SQLite-only.
- Mongo groups on a denormalized local `day` string for timezone parity — never on raw `timestamp`.
- Uses the **standard (non-SRV)** Mongo URI to avoid SRV DNS lookups some local resolvers refuse.

## Environment

```
DISCORD_WEBHOOK_URL=...        # app/api/discord/route.ts
MONGODB_URI=...                # analytics dual-write (non-SRV standard URI); omit → SQLite-only
MONGODB_DB=laundry_silayan
ALLOWED_DEV_ORIGINS=...        # comma-separated dev origins
```

`.env` is gitignored; `.env.example` lists the keys. Never commit credentials.

## Conventions

- **Language/stack**: TypeScript, Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4,
  shadcn-style primitives on Base UI + Radix, `recharts` for charts, pnpm.
- **Style**: small focused files (≤ ~400 lines), single responsibility, explicit error handling,
  immutable patterns, validate at boundaries. See the user rules in `~/.claude/rules/`.
- **API routes** touching SQLite/Mongo set `export const runtime = "nodejs"` (native drivers need Node).
- **Tests**: Jest. Run `pnpm test`. Keep coverage high (see `TODO.md`).

## Commands

```
pnpm dev            # dev server (0.0.0.0:3000)
pnpm build          # production build (also typechecks)
pnpm lint           # eslint --max-warnings 0
pnpm test           # jest

# data-layer utilities (need .env)
pnpm dlx tsx scripts/test-mongo-connection.ts   # verify Mongo connectivity
pnpm dlx tsx scripts/verify-dual-write.ts        # live dual-write e2e (self-cleaning)
pnpm dlx tsx scripts/backfill-mongo.ts           # seed Mongo from existing SQLite (idempotent)
```

## Where to look next

- **Data/persistence**: `docs/data-layer.md`
- **Refactoring priorities / SOLID**: `TODO.md`
- **Collaboration rules**: `AGENTS.md`
- **Design plans**: `docs/plans/`
