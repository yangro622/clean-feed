# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## User Preferences

- The user has no prior frontend experience. Explain frontend concepts in beginner-friendly terms.
- For session workflow, use `/worktree`, `/merge`, `/status` commands.

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Start local dev server (custom Node server)
vercel           # Deploy to Vercel
```

## Architecture Overview

- **Frontend**: `public/index.html` is a single-page app (HTML/CSS/JS) that renders the feed.
- **Backend**: Vercel-style serverless endpoints in `api/`.
- **Sources**:
  - X via `twitterapi.io`
  - YouTube via RSS feeds (channel `channelId`)

## Key Endpoints

- `api/feed.js`: basic feed (X + YouTube), CDN cached.
- `api/feed-sync.js`: cursor-based sync for newer/older posts, not cached.
- `api/feed-stream.js`: server-sent events stream of per-account results.
- `api/balance.js`: twitterapi.io credit balance.

## Behavior Notes

- Posts are chronological, newest first.
- Retweets are filtered out.
- Thread replies are combined for same-author threads in the UI.
- IndexedDB stores cached posts client-side with a retention limit.
- `accounts.json` can group people and include multiple platforms per person.

## Configuration

- `TWITTERAPI_IO_KEY` is required for X.
- `accounts.json` controls who is followed.
- `vercel.json` routes `/api/*` to serverless functions.

## Docs

- `README.md` is public-facing and should stay high-level.
- Keep docs aligned with actual behavior in code.
