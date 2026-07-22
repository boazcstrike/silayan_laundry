# Data Layer — Analytics Persistence (SQLite + MongoDB dual-write)

> Entry point for agents/humans is `AGENTS.md` → `GEMINI.md`. This document is the
> canonical reference for how laundry submissions are stored and read.

Every laundry submission is written to **two** stores and read back for the analytics
dashboard. This page explains the shape, the flow, and the decisions behind it.

> **Local restore points:** while Mongo is unavailable, the server snapshots the SQLite DB on
> every start. See [`backups.md`](./backups.md).

## TL;DR

- **SQLite** (`data/analytics.db`, `better-sqlite3`) — local, synchronous, always present. The
  canonical copy; generates the numeric submission id.
- **MongoDB** (Atlas) — the analytics **source of truth**; what the dashboard reads.
- **Writes** go to SQLite first, then Mongo. A Mongo write failure is logged and swallowed —
  SQLite still holds the record (recording is non-critical to the user flow).
- **Reads** prefer Mongo and **fall back to SQLite** if Mongo is unreachable.
- No `MONGODB_URI` set → the app runs **SQLite-only** (local dev, or Mongo disabled). This is the
  fallback at the config level.

## Data flow

```
Submit (download / discord / whatsapp / viber / messenger)
  client hooks/useSubmission.ts
    → POST /api/submissions
      → getAnalyticsStore()  (DualAnalyticsStore)
        → 1. SQLite  recordSubmission()  → numeric id
        → 2. Mongo   insertSubmission(counts, opts, sqliteId)   [failure logged, swallowed]

Dashboard
  GET /api/analytics  (+ GET /api/submissions?type=summary|channel-stats|…)
    → getAnalyticsStore()
      → try Mongo aggregation pipelines
      → on error → SQLite equivalent  (graceful fallback)
```

**Discord is a submission.** `components/LaundryCounter/LaundryCounter.tsx` uploads the image to
`/api/discord`, then calls `recordSubmission(counts, 'discord', success)`. `download` behaves the
same. So both channels dual-write automatically — no channel-specific persistence code.

## Files (`lib/services/analytics/`)

| File | Responsibility |
|---|---|
| `mongo.ts` | Cached, HMR-safe `MongoClient`; `getMongoDb()`, `isMongoConfigured()`, db-name helper. Fail-fast `serverSelectionTimeoutMS` so a down Mongo drops to the fallback quickly. |
| `AnalyticsStore.ts` | Backend-agnostic **async** interface both stores satisfy. |
| `SqliteAnalyticsStore.ts` | Thin async adapter over the existing `lib/services/AnalyticsDB.ts` (logic unchanged). |
| `MongoAnalyticsStore.ts` | Embedded-doc schema + aggregation pipelines mirroring every SQLite read; `insertSubmission()` (live) + `upsertBySqliteId()` (backfill). |
| `DualAnalyticsStore.ts` | Composes both: dual-write + read-Mongo-fallback-SQLite. |
| `index.ts` | `getAnalyticsStore()` singleton. **Routes depend on this, not on a concrete backend.** |

`lib/services/AnalyticsDB.ts` is the original SQLite class and remains the single home for the SQL.

## Schemas

**SQLite** — two tables (`submissions`, `submission_items`), only non-zero item counts stored.
See `lib/services/AnalyticsDB.ts` `initSchema()`.

**MongoDB** — one `submissions` collection, items **embedded** (idiomatic; items are always read
with their submission and the array is small):

```jsonc
{
  "_id":              ObjectId,
  "sqliteId":         123,            // link to the SQLite row (reconciliation key)
  "timestamp":        ISODate,        // UTC instant
  "day":              "2026-07-22",   // LOCAL calendar day — the grouping key (see below)
  "channel":          "discord",      // download | discord | whatsapp | viber | messenger
  "customerReference": null,
  "scenario":         null,
  "totalItems":       18,             // distinct items known that batch
  "itemsWithValues":  5,              // count of non-zero
  "channelSuccess":   true,
  "items": [ { "name": "Shirt", "count": 3 } ]   // non-zero only
}
```

Indexes (created idempotently on first use): `timestamp`, `channel`, `customerReference`, `day`,
`items.name` (multikey), `sqliteId`.

Mongo docs are camelCase; read methods map them back to the **snake_case** `SubmissionRecord`/
`FullSubmission` shapes so the API and dashboard are identical regardless of backend.

## Key decisions

1. **Mongo-primary reads, SQLite fallback.** Deployed/multi-instance dashboards stay consistent
   (one shared Mongo) while a Mongo outage degrades gracefully to local SQLite.
2. **SQLite-first writes.** Local, synchronous, near-never fails, and generates the canonical id
   that tags the Mongo doc (`sqliteId`).
3. **Denormalized local `day`.** SQLite groups on `date(datetime('now','localtime'))`. Mongo stores
   a UTC `timestamp`; grouping via `$dateToString` on UTC would shift the calendar day across
   timezones and break parity with SQLite and the forecast. We compute a local `YYYY-MM-DD` at write
   time and group on it. **This is the most important parity invariant — do not group on raw
   `timestamp` in Mongo.**
4. **Config-as-fallback.** Missing `MONGODB_URI` → SQLite-only, no crash.
5. **Standard (non-SRV) connection string.** `mongodb+srv://` needs an SRV DNS lookup that some
   local resolvers (e.g. a `127.0.0.1` proxy / VPN) refuse. The standard `mongodb://host1,host2,
   host3/?replicaSet=…&authSource=admin` URI only needs A records. See troubleshooting.

## Environment

```
MONGODB_URI=mongodb://<user>:<pass>@host1:27017,host2:27017,host3:27017/?ssl=true&replicaSet=<rs>&authSource=admin&appName=<app>
MONGODB_DB=laundry_silayan
```

`.env` is gitignored. The URI carries credentials — never commit it. `.env.example` documents the
keys with empty values.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/test-mongo-connection.ts` | Ping + read/write probe. Optional `MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8` to bypass a local resolver that refuses SRV. |
| `scripts/verify-dual-write.ts` | Live end-to-end: dual-writes to a temp SQLite + real Mongo, reads back via pipelines, asserts, cleans up its tagged docs. |
| `scripts/backfill-mongo.ts` | One-time (idempotent) copy of existing SQLite rows into Mongo. Upserts on `sqliteId` — safe to re-run; also reconciles rows a live Mongo write missed. |

Run with `pnpm dlx tsx scripts/<name>.ts` (needs `.env`).

## Extending — add a new analytics read

1. Add the method to `AnalyticsStore` (async signature, existing return type from `AnalyticsDB`).
2. Implement in `SqliteAnalyticsStore` (delegate to `AnalyticsDB`) **and** `MongoAnalyticsStore`
   (aggregation pipeline; return the same shape).
3. Add the fallback wrapper in `DualAnalyticsStore` (`readWithFallback(mongoRead, sqliteRead)`).
4. Consume via `getAnalyticsStore()` in the route. Keep the JSON shape stable.

## Gotchas

- **Timezone parity** — the top parity risk. Always bucket on the denormalized local `day`. Test
  submissions near midnight.
- **Serverless + SQLite** — `better-sqlite3` needs a writable, persistent filesystem. On
  Vercel/serverless `/data` is ephemeral per-instance, so the SQLite copy and fallback won't
  persist across invocations (Mongo becomes the real store). Fine on Docker/self-host (current
  setup). Re-check before any serverless deploy.
- **Missed Mongo writes** — if Mongo is down at write time, SQLite keeps the record and Mongo misses
  it. Re-running `backfill-mongo.ts` upserts the gap closed (reconciliation). No automatic job yet.
- **Reads are async now** — routes must `await` store calls; SQLite is sync under the adapter but
  the interface is async to accommodate Mongo.
```
