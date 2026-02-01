# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## User Preferences

- User has no prior frontend experience - explain frontend concepts in beginner-friendly terms
- For session workflow, use `/worktree`, `/merge`, `/status` commands

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Start local dev server (uses vercel dev)
vercel           # Deploy to Vercel
```

## Architecture

This is a minimal Twitter/X feed reader using twitterapi.io.

**Backend** (`api/feed.js`): Vercel serverless function that:
- Reads Twitter handles from `accounts.json`
- Uses twitterapi.io API ($0.15/1k tweets) with built-in cost controls (max $1/request)
- Filters posts to last 24 hours, returns sorted by newest first
- Skips retweets (only original posts)
- Caches responses for 24 hours (`s-maxage=86400`)

**Frontend** (`public/index.html`): Single-page vanilla HTML/CSS/JS that calls `/api/feed` and renders posts.

**Configuration**:
- `accounts.json`: Array of Twitter usernames to follow
- `.env`: Contains `TWITTERAPI_IO_KEY` (gitignored)
- `vercel.json`: Routes `/api/*` to serverless functions, everything else to `public/`

## Key Design Decisions

- No database—fetches fresh on each load
- No auth—personal use only
- No infinite scroll—renders all posts from last 7 days at once
- twitterapi.io for reliable access (switched from Twitter API v2 due to cost/access issues)
