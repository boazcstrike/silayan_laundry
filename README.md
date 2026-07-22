# Silayan Laundry Quick Image Generation

A Next.js application for tracking laundry items and generating formatted images with counts overlaid on a template. Includes Discord integration for automated submissions.

AI/agent guidance: see `AGENTS.md`.

## Features

- **Laundry Item Counter**: Track counts across multiple categories (Regular Laundry, Home Items, Other Items)
- **Custom Items**: Add and track custom laundry items
- **Image Generation**: Automatically generate images with counts overlaid on template
- **Discord Integration**: Send generated images directly to Discord via webhook
- **Analytics Dashboard** (`/analytics`): Submission history, per-category averages, load/cadence forecasts
- **Dual-write persistence**: Every submission is saved to local SQLite **and** MongoDB — see [`docs/data-layer.md`](docs/data-layer.md)
- **Responsive UI**: Clean, mobile-friendly interface built with Tailwind CSS and shadcn-style primitives

## Prerequisites

- Node.js 18+ and pnpm
- Discord webhook URL (for Discord integration)
- Signature image file (`public/signature.png` or `public/signature_bo.png`)
- MongoDB connection string (optional — omit to run SQLite-only; see [`docs/data-layer.md`](docs/data-layer.md))

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   Copy `.env.example` to `.env` and fill in:
   ```env
   DISCORD_WEBHOOK_URL=your_discord_webhook_url_here

   # Optional — enables MongoDB dual-write. Omit to run SQLite-only.
   # Use the STANDARD (non-SRV) Atlas URI to avoid SRV DNS lookups (see Troubleshooting).
   MONGODB_URI=mongodb://user:pass@host1:27017,host2:27017,host3:27017/?ssl=true&replicaSet=<rs>&authSource=admin&appName=<app>
   MONGODB_DB=laundry_silayan
   ```
   `.env` is gitignored — never commit credentials.

3. **Add signature file:**
   Place your signature image as `public/signature.png` or update the path in `app/page.tsx` (line 147)

4. **Run the development server:**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
laundry-silayan/
├── app/
│   ├── page.tsx                    # Counter page (LaundryCounter)
│   ├── analytics/page.tsx          # Analytics dashboard
│   ├── layout.tsx                  # Root layout + navigation shell
│   └── api/
│       ├── discord/route.ts        # Discord webhook proxy
│       ├── submissions/route.ts    # Record submission + summary reads
│       └── analytics/route.ts      # Dashboard payload + forecasts
├── components/
│   ├── LaundryCounter/             # Counter UI components
│   └── ui/                         # shadcn-style primitives (Base UI + Radix)
├── hooks/                          # useSubmission, useLaundryItems, ...
├── lib/
│   ├── services/AnalyticsDB.ts     # SQLite data class (better-sqlite3)
│   ├── services/analytics/         # Store abstraction + MongoDB dual-write
│   ├── laundryForecast.ts          # Cadence forecast
│   └── laundryLoadForecast.ts      # Per-category load forecast
├── scripts/                        # Mongo connection/verify/backfill utilities
├── data/analytics.db               # Local SQLite database (gitignored)
├── docs/data-layer.md              # Persistence architecture reference
└── public/                         # Static assets (template.jpg, signature.png)
```

## Configuration

### Template Image
The application uses `public/template.jpg` as the base image. Item coordinates are defined in `app/assets/data/list.tsx`.

### Discord Webhook
1. Create a Discord webhook in your server settings
2. Copy the webhook URL
3. Add it to `.env.local` as `DISCORD_WEBHOOK_URL`

### Customizing Items
Edit `app/assets/data/list.tsx` to:
- Add/remove laundry categories
- Adjust item coordinates for the template
- Modify item names

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run production server
pnpm start

# Lint code
pnpm lint
```

## Data & Analytics

Submissions are **dual-written** to a local SQLite file (`data/analytics.db`) and to MongoDB, and the
`/analytics` dashboard reads MongoDB with SQLite as a fallback. Discord and download sends are both
recorded as submissions. Full architecture, schema, decisions, and gotchas:
**[`docs/data-layer.md`](docs/data-layer.md)**.

Data-layer utilities (need `.env`):

```bash
pnpm dlx tsx scripts/test-mongo-connection.ts   # verify MongoDB connectivity (ping + read/write)
pnpm dlx tsx scripts/verify-dual-write.ts        # live dual-write end-to-end test (self-cleaning)
pnpm dlx tsx scripts/backfill-mongo.ts           # seed MongoDB from existing SQLite (idempotent)
```

## Tech Stack

- **Framework**: Next.js 16 with App Router (Turbopack)
- **Language**: TypeScript · React 19
- **Styling**: Tailwind CSS v4 with class-variance-authority
- **UI Components**: shadcn-style primitives on Base UI + Radix
- **Charts**: Recharts
- **Data**: better-sqlite3 (local) + MongoDB driver (dual-write)
- **Icons**: Lucide React
- **Package Manager**: pnpm

## Code Quality

- ESLint configured for code consistency
- TypeScript for type safety
- Pre-commit hooks recommended (not yet configured)

## Deployment

The easiest way to deploy is using [Vercel](https://vercel.com):

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel
```

Set `DISCORD_WEBHOOK_URL`, `MONGODB_URI`, and `MONGODB_DB` in your Vercel project settings.

> **Serverless note:** `better-sqlite3` needs a writable, persistent filesystem. On
> Vercel/serverless the local `data/analytics.db` is ephemeral per-instance, so MongoDB becomes the
> real store and the SQLite copy/fallback won't persist across invocations. On Docker/self-host
> (the current setup) both persist. See [`docs/data-layer.md`](docs/data-layer.md).

## Troubleshooting

### Image Generation Issues
- Ensure `public/template.jpg` exists
- Check item coordinates in `list.tsx` match template layout
- Verify signature image path is correct

### Discord Integration Issues
- Confirm `DISCORD_WEBHOOK_URL` is set in environment
- Check Discord webhook is still valid
- Verify file size limits (Discord has 8MB limit for free tier)

### MongoDB Connection Issues
- **`querySrv ECONNREFUSED`** — your local DNS resolver refuses SRV lookups. Use the **standard
  (non-SRV)** `mongodb://host1,host2,host3/?replicaSet=…` URI instead of `mongodb+srv://`, or set
  `MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8` when running the scripts.
- **TLS alert / handshake rejected** — the machine's IP isn't in the Atlas **Network Access**
  allowlist, or the cluster is paused.
- **Dashboard empty after enabling Mongo** — reads come from Mongo; seed history with
  `pnpm dlx tsx scripts/backfill-mongo.ts`.
- App runs fine **without** `MONGODB_URI` (SQLite-only) — set it only when you want the shared
  MongoDB store.

### Development Issues
- Clear `.next` cache: `rm -rf .next`
- Reinstall dependencies: `pnpm install --force`
- Check Node.js version: `node --version` (requires 18+)

## Contributing

See `AGENTS.md` for agent collaboration guidelines and `GEMINI.md` for detailed project context.

## License

MIT
