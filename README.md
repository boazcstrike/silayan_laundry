# Silayan Laundry Quick Image Generation

A Next.js application for tracking laundry items and generating formatted images with counts overlaid on a template. Includes Discord integration for automated submissions.

AI/agent guidance: see `AGENTS.md`.

## Features

- **Laundry Item Counter**: Track counts across multiple categories (Regular Laundry, Home Items, Other Items)
- **Custom Items**: Add and track custom laundry items
- **Image Generation**: Automatically generate images with counts overlaid on template
- **Discord Integration**: Send generated images directly to Discord via webhook
- **Responsive UI**: Clean, mobile-friendly interface built with Tailwind CSS and Radix UI

## Prerequisites

- Node.js 18+ and pnpm
- Discord webhook URL (for Discord integration)
- Signature image file (`public/signature.png` or `public/signature_bo.png`)

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file with:
   ```env
   DISCORD_WEBHOOK_URL=your_discord_webhook_url_here
   ```

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
│   ├── page.tsx              # Main application page
│   ├── layout.tsx            # Root layout
│   ├── api/discord/route.ts  # Discord webhook API endpoint
│   └── assets/data/list.tsx  # Laundry item categories and coordinates
├── components/ui/            # Reusable UI components
├── lib/utils.ts              # Utility functions
└── public/                   # Static assets (template.jpg, signature.png)
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

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with class-variance-authority
- **UI Components**: Radix UI primitives
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

Make sure to set the `DISCORD_WEBHOOK_URL` environment variable in your Vercel project settings.

## Troubleshooting

### Image Generation Issues
- Ensure `public/template.jpg` exists
- Check item coordinates in `list.tsx` match template layout
- Verify signature image path is correct

### Discord Integration Issues
- Confirm `DISCORD_WEBHOOK_URL` is set in environment
- Check Discord webhook is still valid
- Verify file size limits (Discord has 8MB limit for free tier)

### Development Issues
- Clear `.next` cache: `rm -rf .next`
- Reinstall dependencies: `pnpm install --force`
- Check Node.js version: `node --version` (requires 18+)

## Contributing

See `AGENTS.md` for agent collaboration guidelines and `GEMINI.md` for detailed project context.

## License

MIT
