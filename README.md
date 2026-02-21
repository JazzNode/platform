# JazzNode Web 🎵

> The Jazz Scene, Connected. — The IMDb of Jazz.

## Stack

- **Next.js 16** (App Router, SSG + ISR)
- **Tailwind CSS v4** + **shadcn/ui**
- **next-intl** (EN / 繁中 / 日本語)
- **Airtable REST API** (build-time fetch, no SDK)
- **Vercel** (deployment)

## Getting Started

```bash
# Install
npm install

# Set environment variables
cp .env.local.example .env.local
# Edit .env.local with your Airtable PAT

# Dev
npm run dev

# Build
npm run build
```

## Architecture

```
Airtable (SSOT)
    ↓ REST API (build-time only)
Next.js SSG + ISR (revalidate: 1h)
    ↓
Vercel CDN → Users
```

- **Zero runtime API calls** — all data fetched at build time
- **ISR** — pages revalidate every hour automatically
- **Three languages** — URL-based: `/en/`, `/zh/`, `/ja/`

## Routes

| Route | Description |
|---|---|
| `/[locale]` | Homepage — upcoming events + featured venues |
| `/[locale]/venues` | All venues (grouped by city) |
| `/[locale]/venues/[id]` | Venue detail + events |
| `/[locale]/artists` | All artists (grouped by instrument) |
| `/[locale]/artists/[id]` | Artist detail + events |
| `/[locale]/events` | All events (grouped by month) |

## Roadmap

- [ ] MVP: Browse-only (current)
- [ ] Search + filters
- [ ] JSON-LD structured data (SEO)
- [ ] Supabase Auth + Follow
- [ ] Claims workflow
- [ ] Push notifications
