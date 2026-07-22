# Plan: MongoDB + SQLite Dual-Write for Laundry Analytics

**Goal:** Every submission (including Discord sends) is written to **both** MongoDB and the local SQLite file. MongoDB is the primary source for the analytics dashboard; SQLite is a local durable copy and the read fallback when Mongo is unreachable.

**Decisions locked (user):**
- Analytics reads: **Mongo primary, SQLite fallback**.
- Access layer: **official `mongodb` driver** (no Mongoose) + thin repository + Zod-style validation at boundary.
- Write mode: **await both, SQLite first**; if Mongo write fails, log and still return `ok` (SQLite has the copy). Recording is already non-critical client-side.

**Already true (no client changes):** Discord send already records a submission — `LaundryCounter.tsx:124` calls `recordSubmission(counts, 'discord', success)` after `uploadImage` → `/api/discord`. `download` does the same. The whole change is **server-side** in the write path (`/api/submissions`) and the read path (`/api/analytics`).

---

## Architecture

Introduce a store abstraction (repository pattern) so the API routes don't know which backend they hit.

```
AnalyticsStore (interface)          lib/services/analytics/AnalyticsStore.ts
 ├─ SqliteAnalyticsStore            wraps existing AnalyticsDB (extract, unchanged logic)
 ├─ MongoAnalyticsStore             new — mongodb driver + aggregation pipelines
 └─ DualAnalyticsStore              writes BOTH (SQLite→Mongo); reads Mongo, falls back to SQLite
```

- `getAnalyticsStore()` returns a singleton `DualAnalyticsStore`.
- If `MONGODB_URI` is unset (e.g. local dev without Mongo), `DualAnalyticsStore` degrades to SQLite-only — no crash, no config gymnastics. This IS the fallback mechanism at the config level.
- `/api/submissions` POST and `/api/analytics` GET call `getAnalyticsStore()` instead of `getAnalyticsDB()`. API response shapes stay identical (dashboard + client untouched).

---

## MongoDB schema — embedded document (one collection)

Idiomatic Mongo: items always fetched with their submission, array is small/bounded. Avoid a second `submission_items` collection.

**Collection `submissions`:**

```jsonc
{
  "_id":              ObjectId,
  "sqliteId":         123,            // links to local SQLite row; null if Mongo-only insert
  "timestamp":        ISODate,        // UTC instant
  "day":              "2026-07-22",   // LOCAL day string, denormalized — see note
  "channel":          "discord",      // download | discord | whatsapp | viber | messenger
  "customerReference": null,
  "scenario":         null,
  "totalItems":       18,             // total distinct items known that batch
  "itemsWithValues":  5,              // count of non-zero
  "channelSuccess":   true,
  "items": [                          // ONLY non-zero counts (parity with SQLite)
    { "name": "Shirt", "count": 3 },
    { "name": "Towel", "count": 2 }
  ]
}
```

**Why `day` is denormalized:** SQLite writes `datetime('now','localtime')` and groups with `date(timestamp)`. Mongo stores a UTC `timestamp`; grouping via `$dateToString` on UTC would shift the calendar day across timezones and break parity with SQLite / the forecast (which keys off local laundry days). Store the local `YYYY-MM-DD` explicitly at write time and group on it. Single source of truth for "which day."

**Indexes:**
- `{ timestamp: -1 }` — recent lists, date ranges.
- `{ channel: 1 }` — channel stats.
- `{ customerReference: 1 }` — customer lookup.
- `{ day: 1 }` — daily counts / timeline / laundry-days.
- `{ "items.name": 1 }` — multikey, per-item aggregations.

Optional: `$jsonSchema` collection validator to enforce the shape server-side (cheap insurance; validate at app boundary regardless).

---

## Read queries → Mongo aggregation pipelines

Port each `AnalyticsDB` read to a pipeline in `MongoAnalyticsStore`. Parity targets:

| Method | Pipeline sketch |
|---|---|
| `getSummary` | (a) `$group` total, `$sum` success, `$avg itemsWithValues`; (b) `$unwind items` → `$group items.name` sum+freq → `$sort` → `$limit 10`; (c) recent 5 via `find().sort({timestamp:-1}).limit(5)` |
| `getCategoryAverages(limit)` | `$unwind items` → `$group name {avg,sum,count}` → `$sort avg desc` → `$limit` |
| `getCategoryTimeline` | `$unwind items` → `$group {day,name} sum` → `$sort day asc` |
| `getDailyCounts(n)` | `$group day count` → `$sort day desc` → `$limit n` → reverse in JS |
| `getLaundryDays` | `distinct('day')` → sort asc |
| `getChannelStats` | `$group channel {count, avg success}` → `$sort count desc` |
| `getRecentSubmissions` / `getSubmissionsByChannel` / `getSubmissionsByDateRange` | `find` + sort + limit; map `_id`→id, keep `items` |

Each returns the **same TS interfaces** already exported by `AnalyticsDB` (`AnalyticsSummary`, `CategoryAverage`, `CategoryTimelineRow`, `DailyCount`, `FullSubmission`), so `/api/analytics` needs no reshaping.

**Read fallback:** `DualAnalyticsStore.getX()` → `try mongo.getX()` `catch → sqlite.getX()`. Set a short `serverSelectionTimeoutMS` (e.g. 3000) so a down Mongo fails fast to SQLite instead of hanging the dashboard.

---

## Connection module

`lib/services/analytics/mongo.ts` — Next.js HMR-safe cached client:

- Cache a `MongoClient` connect promise on `globalThis` (dev survives hot-reload; prod reuses across invocations).
- Read `MONGODB_URI` + `MONGODB_DB` from env; export `getMongoDb()`.
- `serverSelectionTimeoutMS` low; pool defaults fine.
- `export const runtime = "nodejs"` already set on both routes — driver needs Node, not edge. Good.

---

## Write path

`DualAnalyticsStore.recordSubmission(counts, opts)`:
1. `const id = sqlite.recordSubmission(...)` — synchronous, local, returns numeric id (keeps API `submissionId`).
2. `await mongo.insertSubmission({ ...opts, sqliteId: id, day, items })` — filter non-zero items, compute local `day`.
3. Mongo throws → `console.error` + continue. Return `id`. (SQLite is the guaranteed copy.)

`/api/submissions` POST keeps its exact request/response contract.

---

## Env & config

`.env` additions (document in README / `.env.example`):
```
MONGODB_URI=mongodb+srv://...        # user pastes this
MONGODB_DB=laundry_silayan
```
- Missing `MONGODB_URI` → Mongo disabled, SQLite-only (dev friendly).
- **Secret:** never commit the URI; it carries credentials. Add to `.env` (gitignored) + deployment env.

---

## One-time backfill

`scripts/backfill-mongo.ts` — copy existing `data/analytics.db` rows into Mongo so the dashboard isn't empty on cutover:
- Read all submissions + items from SQLite, transform to embedded docs (set `sqliteId`, derive `day` from stored `timestamp`).
- Upsert on `sqliteId` (idempotent — safe to re-run).
- Run once after Mongo URI is set.

---

## Task list

**Phase 1 — deps & connection**
1. `pnpm add mongodb`. (Consider `zod` for boundary validation if not preferred inline.)
2. `lib/services/analytics/mongo.ts` — cached client + `getMongoDb()`.
3. `.env.example` + README env note.

**Phase 2 — store abstraction**
4. `AnalyticsStore.ts` interface (extract the public method signatures from `AnalyticsDB`).
5. `SqliteAnalyticsStore` — wrap existing `AnalyticsDB` (keep `AnalyticsDB` as-is; adapter around it). Keep back-compat exports.
6. `MongoAnalyticsStore` — write + the aggregation pipelines above; ensure indexes on first use (`createIndexes`, idempotent).
7. `DualAnalyticsStore` — dual-write (SQLite→Mongo) + read-with-fallback. `getAnalyticsStore()` singleton.

**Phase 3 — wire routes**
8. `/api/submissions` POST → `getAnalyticsStore().recordSubmission`.
9. `/api/analytics` GET + `/api/submissions` GET → `getAnalyticsStore()` reads. Verify identical JSON.

**Phase 4 — backfill & tests**
10. `scripts/backfill-mongo.ts` (idempotent upsert on `sqliteId`).
11. Tests: `mongodb-memory-server` for `MongoAnalyticsStore` pipeline parity vs `AnalyticsDB` on the same fixture data; unit-test `DualAnalyticsStore` fallback (Mongo throws → SQLite result); keep coverage ≥ 80%.
12. `pnpm lint` + `pnpm build`. Smoke: submit on `/` and via Discord → row in both stores; kill Mongo → dashboard still renders from SQLite.

---

## Risks / notes
- **Day/timezone parity** — the single most likely bug. Denormalized local `day` mitigates; test that a submission recorded near midnight lands on the same day in both stores.
- **Serverless SQLite** — `better-sqlite3` needs a writable, persistent filesystem. On Vercel/serverless `/data` is ephemeral per-instance, so the SQLite "copy" and fallback won't persist across invocations (Mongo becomes the real store). Fine on Docker/self-host (current setup). Flag before any serverless deploy.
- **Mongo down at write** — accepted: SQLite keeps the record, Mongo misses it. A periodic reconciliation job (re-run backfill upserting unsynced `sqliteId`s) closes the gap if needed. Out of scope for v1; note the hook.
- **Index build** — `createIndexes` on first connect is idempotent and cheap at this data volume.
- **Validation** — validate `channel` + `counts` at the API boundary (already partly done in POST) before either write.
```
