# Deploy to Cloudflare — Research & Backlog

> **Status: BACKLOG. Not started.** Local development runs as-is (SQLite + MongoDB).
> This document captures the research so a future deploy doesn't re-derive it.
>
> Entry point for agents/humans is `AGENTS.md` → `GEMINI.md`. For how persistence works
> today, see [`data-layer.md`](./data-layer.md) — read that first; this builds on it.

## Goal

Deploy the laundry app to a **Cloudflare account separate from the machine's logged-in
Cloudflare OAuth session** (different email / workspace), without disturbing that session.

## Part 1 — Account isolation (SOLVED, verified)

Wrangler credential precedence (highest wins):

1. `CLOUDFLARE_API_TOKEN` environment variable
2. OAuth session from `wrangler login` (`%APPDATA%\xdg.config\.wrangler` on Windows)

Setting the env var makes Wrangler ignore the logged-in account for that shell only. Both
accounts coexist — no logout, no global state change.

### How it was verified

A scoped API token was created in the **target** account (permissions: Workers Scripts →
Edit, Cloudflare Pages → Edit, Account Settings → Read; scoped to that one account). Then:

```powershell
$env:CLOUDFLARE_API_TOKEN = "<target-account-token>"
$env:CLOUDFLARE_ACCOUNT_ID = "<target-account-id>"
wrangler whoami   # confirmed it resolves the TARGET account, not the OAuth login
```

`wrangler whoami` is the pre-deploy safety check — always run it to confirm the target
before `wrangler deploy`.

> **Recommended token permissions (minimum):** Workers Scripts → Edit, Cloudflare Pages →
> Edit, Account Settings → Read. Add Workers KV / R2 / Workers Routes only when those are
> actually wired. Scope **Account Resources** to the single target account, not "All".

> ⚠️ **Security:** the token used during research was pasted into a chat and is therefore
> **compromised — revoke it** in the target account (My Profile → API Tokens) and issue a
> fresh one that lives only in an env var / secret store. Never commit a token.

## Part 2 — Persistence blocker (the real work; NOT solved)

The current data layer does **not** run on Cloudflare's edge runtime (workerd) unchanged.

| Dependency | Blocker level | Reason | Path forward |
|---|---|---|---|
| `better-sqlite3` | **Hard** | Native C++ addon + writes to local disk `data/analytics.db`. workerd has no native modules and no persistent local filesystem — it cannot load. | Replace with **Cloudflare D1** (SQLite-compatible, native to Workers) **or** drop SQLite entirely. |
| `mongodb` (v7.5) | **Soft** | Node driver connects over raw TCP + DNS-SRV, which need Node's `net`/`dns`. workerd is not Node. | Works with config — see below. |

### Why MongoDB is only a *soft* blocker

Being remote was never the issue — the connection mechanism is. Modern setup makes it work:

- MongoDB driver **v6.7+** officially supports Cloudflare Workers (repo is on **v7.5** ✔).
- Requires the **`nodejs_compat`** flag in `wrangler.jsonc` (OpenNext enables it).
- `mongodb+srv://` DNS-SRV strings **do not resolve** on Workers → must use the **direct
  seed-list** connection string: `mongodb://host1,host2,.../?ssl=true&replicaSet=...`
  (Atlas → Connect → Drivers → "older version" gives this form).
- Connection pooling behaves differently (no long-lived pool reused across requests).

On a **Node host** (Vercel / Fly / Railway) the Mongo driver works with zero changes.

## Deploy options (decide when picked up)

### Option A — Cloudflare Workers, Mongo-primary (recommended for Cloudflare)

Smallest Cloudflare-native change. The data layer **already reads from Mongo first** and
only uses SQLite to generate the numeric submission id.

Steps:

1. `pnpm add @opennextjs/cloudflare` + create `wrangler.jsonc` with `nodejs_compat`.
2. Delete the SQLite half of the dual-write; make Mongo the canonical store.
3. Move id generation into Mongo (ObjectId, or a `counters` doc for the numeric id).
4. Use the direct (non-SRV) Atlas connection string; put `MONGODB_URI` in Wrangler secrets
   (`wrangler secret put MONGODB_URI`).
5. `wrangler whoami` (confirm target account) → `wrangler deploy`.

Files touched: `lib/services/analytics/DualAnalyticsStore.ts`, `.../index.ts`,
`.../SqliteAnalyticsStore.ts` (remove), `lib/services/AnalyticsDB.ts` (remove), id-gen in
`MongoAnalyticsStore.ts`. See `data-layer.md` for the map.

### Option B — Cloudflare Workers + D1 migration

Keep a SQLite-shaped store but on **D1**. Rewrite `AnalyticsDB.ts` against the D1 binding
(SQL mostly reused; API is async). More work than Option A; only worth it if Mongo is being
dropped and you still want relational storage on Cloudflare.

### Option C — Node host instead of Cloudflare (deployable today, near-zero change)

- **Vercel** — Next-native. Mongo works as-is; SQLite is **ephemeral** (no persistent disk on
  serverless) → effectively Mongo-only, same as Option A but no runtime porting.
- **Fly.io / Railway** — attach a **persistent volume** → both SQLite *and* Mongo run unchanged.

## Recommendation

If Cloudflare is a hard requirement → **Option A** (Workers + Mongo-primary). If the goal is
just "get it hosted with the analytics working" → **Option C on Fly/Railway** is the least
code change (both stores survive on a volume).

## Backlog checklist (future)

- [ ] Revoke the compromised research token; issue a fresh scoped token into env/secret store
- [ ] Pick a deploy option (A / B / C)
- [ ] If A: add `@opennextjs/cloudflare`, `wrangler.jsonc` (`nodejs_compat`), remove SQLite, Mongo id-gen
- [ ] Switch Atlas to direct (non-SRV) connection string; store `MONGODB_URI` as a Wrangler secret
- [ ] Pin `account_id` in `wrangler.jsonc` to the target account
- [ ] `wrangler whoami` confirms target account before first `wrangler deploy`
