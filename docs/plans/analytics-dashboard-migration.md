# Plan: Migrate Laundry Analytics Dashboard from bobot → laundry-silayan

**Goal:** Bring bobot's laundry analytics dashboard into laundry-silayan as a real navigable
section. laundry-silayan is currently a single-page image generator with no navigation; this adds
a sidebar shell and an `/analytics` route driven by the app's own SQLite data.

**Decisions locked (user):** Full shadcn sidebar navigation · charts ported to strict TSX ·
laundry analytics only (no expenses / credit-cards / github).

---

## Architecture: what changes vs. what stays

bobot reads laundry-silayan's `data/analytics.db` **remotely** over `@libsql/client`. Inside
laundry-silayan the data is local, so all remote/plumbing pieces are **dropped** and we reuse the
existing `AnalyticsDB` (`better-sqlite3`).

**Keep / port:**
- Forecast libs `laundryForecast.ts` (EWMA cadence) + `laundryLoadForecast.ts` (per-category trend) — pure TS, copy verbatim.
- 4 chart components: `current-load-chart`, `category-average-chart`, `forecast-load-chart`, `laundry-forecast` (recharts).
- Laundry summary page (summary card, forecast highlight, success meter, Current/Forecasting tabs).
- Laundry-relevant CSS subset (dashboard cards, forecast-highlight, success-meter, tabs, bars).

**Drop:**
- `@libsql/client`, `repoPath` config route + `laundryConfig.js`.
- Server manager (`/api/laundry/server`, `laundryServerManager.js`) + the Runtime play/stop card.
- 9-theme engine, settings modal, `ControlRailShell`, `nav-user` account menu — out of scope. Keep laundry-silayan's existing `ThemeProvider` + `ThemeToggle` (light/dark).

---

## Component-library fork (the one real decision)

bobot's shadcn primitives are built on **`@base-ui/react`** (`render={<Link/>}` prop pattern).
laundry-silayan's `button` uses **Radix** (`@radix-ui/react-slot`).

**Recommended — adopt Base UI for the ported pieces:** add `@base-ui/react`, copy bobot's
`components/ui/*` (sidebar, sheet, tabs, dialog, card, table, chart, tooltip, separator,
collapsible, skeleton, input) converting `.jsx → .tsx`, and copy `app-sidebar` unchanged. Highest
fidelity, minimal rewrite. Radix `button` and Base UI components coexist without issue.
*(Alternative: regenerate Radix shadcn via CLI and rewrite every `render` → `asChild` — more churn, no user-visible benefit.)*

---

## Task list

### Phase 1 — deps & data layer
1. Add deps: `recharts@^3`, `@base-ui/react@^1.5`. (`better-sqlite3`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` already present.)
2. Extend `lib/services/AnalyticsDB.ts` with the dashboard read queries (port from bobot's `api/laundry/analytics/route.js`):
   - `getCategoryAverages()` — avg/total/batches per item.
   - `getCategoryTimeline()` — per-day per-item counts (for current-load chart).
   - `getDailyCounts(7)` — submissions per day, last 7.
   - `getLaundryDays()` — distinct submission dates (feeds forecast).
3. Copy `lib/laundryForecast.ts` + `lib/laundryLoadForecast.ts` verbatim (+ their tests, convert vitest → jest).
4. New route `app/api/analytics/route.ts` (`runtime = "nodejs"`): assemble summary via `AnalyticsDB`, run `forecastNextLaundry` / `projectLaundryDays` / `forecastCategoryLoads` / `buildIntervalHistory`. Returns the same JSON shape the page expects.

### Phase 2 — UI primitives
5. Add `components/ui/`: `card`, `table`, `tabs`, `chart`, `sheet`, `tooltip`, `separator`, `collapsible`, `skeleton`, `sidebar`, `input` — ported from bobot (`.jsx → .tsx`, Base UI).
6. Verify design tokens (already in `globals.css`) cover chart + sidebar; port the `hooks/use-mobile` used by sidebar.

### Phase 3 — navigation shell
7. `components/AppSidebar.tsx` — trimmed to: **Counter** (`/`) and **Analytics** (`/analytics`). Drop Expenses/GitHub groups and `nav-user`.
8. Lightweight `SidebarProvider` wrapper in `app/layout.tsx` (inside existing `ThemeProvider`), with a header holding `SidebarTrigger` + existing `ThemeToggle`. No theme engine, no settings modal.
9. Move current counter page content untouched under the shell (`/` still renders `LaundryCounter`).

### Phase 4 — analytics page
10. `app/analytics/page.tsx` — port bobot `app/laundry/page.js` → TSX: summary card, forecast highlight, success meter, Current/Forecasting tabs. Fetch from `/api/analytics` (drop the server-poll + config-form logic).
11. Port 4 chart components → `components/analytics/*.tsx` (strict TSX, typed props).

### Phase 5 — styles, tests, verify
12. Port laundry/dashboard CSS subset from bobot `globals.css` into laundry-silayan `globals.css` (cards, forecast-*, success-meter, laundry-tabs, bars, dual-col). Skip the theme-engine/aurora/glass rules.
13. Tests: unit-test new `AnalyticsDB` methods; keep ported forecast lib tests (jest). Keep coverage ≥ 80%.
14. Run `pnpm lint` + `pnpm build`. Manual smoke: `/` counter still submits & records; `/analytics` renders charts from real `data/analytics.db`; sidebar toggles; light/dark intact.

---

## Risks / notes
- **Base UI + Radix coexistence** — low risk, but validate sidebar/sheet focus + mobile drawer after port.
- **recharts SSR** — bobot loads charts via `next/dynamic { ssr:false }`; keep that pattern.
- **lint `--max-warnings 0`** — all ported files must be TSX and typed; no leftover `.jsx`.
- **DB path** — `AnalyticsDB` uses `process.cwd()/data/analytics.db`; already correct in this repo. No `repoPath` config needed.
- **Empty-state** — forecast needs ≥ 2 distinct laundry days; page already handles the "not enough data" case — preserve it.
