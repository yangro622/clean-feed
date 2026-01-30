# Clean Feed

A minimal, distraction-free Twitter/X feed reader.

## Why This Exists

Social media platforms optimize for engagement, not for you. Their algorithms push high-dopamine, low-quality content to keep you scrolling. You open the app to check one thing and emerge 45 minutes later wondering what happened.

Clean Feed is the antidote:

- **You choose who to follow** - No algorithmic recommendations, trending topics, or "you might like" suggestions
- **Chronological order** - See posts in the order they were made, newest first
- **Just the posts** - No ads, no promoted content, no engagement bait
- **Last 7 days only** - No infinite scroll rabbit holes

This is Twitter the way it should be: a tool you control, not one that controls you.

## How It Works

```
Your Browser  →  Vercel Serverless Function  →  twitterapi.io
                        ↓
              Returns posts from accounts
              you specified, sorted by time
```

- Backend fetches tweets via [twitterapi.io](https://twitterapi.io) (third-party Twitter data API)
- Frontend displays them in a clean, minimal interface
- Posts are cached for 5 minutes (server) and 24 hours (browser)
- Built-in cost controls: max $1.00 per request
- No database, no user accounts, no tracking

---

## Setup Guide

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- A [twitterapi.io](https://twitterapi.io) account and API key
- A [Vercel Account](https://vercel.com/) (free tier works fine)
- [Vercel CLI](https://vercel.com/cli) installed: `npm install -g vercel`

### Step 1: Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/clean-feed.git
cd clean-feed
npm install
```

### Step 2: Get twitterapi.io API Key

1. Go to [twitterapi.io](https://twitterapi.io) and create an account
2. Navigate to your dashboard to find your API key
3. Copy the API key - you'll need it in the next step

> **Pricing:** twitterapi.io charges $0.15 per 1,000 tweets fetched. The app has built-in cost controls (max $1.00 per request, ~6,666 tweets).

### Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then edit `.env` and add your API key:

```
TWITTERAPI_IO_KEY=your_api_key_here
```

### Step 4: Choose Accounts to Follow

Create an `accounts.json` file:

```bash
cp accounts.example.json accounts.json
```

Edit `accounts.json` with the Twitter usernames you want to follow (without the @ symbol):

```json
[
  "naval",
  "paulg",
  "sama"
]
```

### Step 5: Test Locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser. You should see posts from your chosen accounts.

### Step 6: Deploy to Vercel

```bash
vercel
```

Follow the prompts to link/create a Vercel project.

Then set your environment variables on Vercel:

```bash
# Set your twitterapi.io API key
vercel env add TWITTERAPI_IO_KEY

# Set your accounts list (comma-separated, no spaces around commas)
vercel env add TWITTER_ACCOUNTS
```

For `TWITTER_ACCOUNTS`, enter your usernames as a comma-separated list:
```
naval,paulg,sama
```

Deploy again to apply the environment variables:

```bash
vercel --prod
```

Your clean feed is now live at your Vercel URL.

---

## Configuration Reference

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TWITTERAPI_IO_KEY` | Yes | Your twitterapi.io API key |
| `TWITTER_ACCOUNTS` | Production | Comma-separated list of usernames to follow |

### Files

| File | Purpose |
|------|---------|
| `accounts.json` | Local development: list of accounts to follow |
| `.env` | Local development: environment variables |
| `api/feed.js` | Serverless function that fetches tweets |
| `public/index.html` | Frontend (HTML + CSS + JavaScript in one file) |
| `vercel.json` | Vercel routing configuration |

### Cost Controls

The app has built-in cost safety limits:

- **$0.15 per 1,000 tweets** - twitterapi.io pricing
- **$1.00 max per request** - Hard limit (~6,666 tweets max)
- Cost metadata included in API response (`_meta.estimatedCost`)

---

## Troubleshooting

### "TWITTERAPI_IO_KEY not configured"

Your API key isn't set. Check:
- Local: `.env` file exists and contains `TWITTERAPI_IO_KEY=...`
- Vercel: Run `vercel env ls` to verify the variable is set

### "HTTP 429" errors

You've hit the API rate limit. Wait a few minutes and try again.

### "HTTP 402" errors

Check your twitterapi.io account balance and billing status.

### Posts not showing

- Verify usernames in `accounts.json` are correct (no @ symbol)
- Check that accounts have posted in the last 7 days
- Some accounts may be protected/private
- Retweets are filtered out (only original posts shown)

### Local server not starting

Make sure you have Node.js 18+ installed:
```bash
node --version
```

---

## Project Structure

```
clean-feed/
├── api/
│   └── feed.js          # Serverless function (twitterapi.io calls)
├── public/
│   └── index.html       # Frontend (single HTML file)
├── accounts.json        # Your follow list (local dev, gitignored)
├── accounts.example.json # Template for accounts.json
├── .env                 # Your secrets (local dev, gitignored)
├── .env.example         # Template for .env
├── vercel.json          # Vercel routing config
└── package.json         # Dependencies and scripts
```

---

## Privacy & Security

- Your API key is stored only in `.env` (local) or Vercel's encrypted environment variables (production)
- Your accounts list stays private (gitignored locally, stored in Vercel env vars for production)
- No analytics, no tracking, no data collection
- The app runs entirely on your own Vercel instance

---

## License

MIT - Do whatever you want with it.
