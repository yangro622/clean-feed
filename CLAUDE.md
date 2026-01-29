# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Start local dev server (uses vercel dev)
vercel           # Deploy to Vercel
```

## Architecture

This is a minimal Twitter/X feed reader that fetches RSS via Nitter instances (no API key required).

**Backend** (`api/feed.js`): Vercel serverless function that:
- Reads Twitter handles from `accounts.json`
- Tries multiple Nitter instances as fallbacks for RSS feeds
- Filters posts to last 24 hours, returns sorted by newest first
- Caches responses for 5 minutes (`s-maxage=300`)

**Frontend** (`public/index.html`): Single-page vanilla HTML/CSS/JS that calls `/api/feed` and renders posts.

**Configuration**:
- `accounts.json`: Array of Twitter usernames to follow
- `vercel.json`: Routes `/api/*` to serverless functions, everything else to `public/`

## Key Design Decisions

- No database—fetches fresh on each load
- No auth—personal use only
- No infinite scroll—renders all posts from last 24 hours at once
- Nitter instances are hardcoded in `api/feed.js` with automatic fallback
