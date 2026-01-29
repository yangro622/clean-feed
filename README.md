# Clean Feed

Minimal personal Twitter feed reader. Chronological posts from accounts you choose, no algorithm.

## Setup

1. Edit `accounts.json` with your Twitter handles
2. Deploy to Vercel: `vercel`

## Local Development

```bash
npm install
npm run dev
```

## How It Works

- Fetches RSS feeds from Nitter instances (no API key needed)
- Filters to last 24 hours
- Displays chronologically, newest first
