# Clean Feed

A minimal, distraction-free feed reader for X and YouTube.

## Why This Exists

Social feeds optimize for attention and time on platform, not for you. If the business is ad‑driven, the incentives are clear and the outcome is predictable.

Short‑form video is injected in places you can’t ignore or remove, even on paid tiers. And the algorithm gets very good at reinforcing who you already are. What it doesn’t do is help you become who you want to be.

Clean Feed is for consumers who want high‑signal, zero‑noise information. It’s a way to reclaim attention and shape the direction you’re choosing, instead of the direction the feed chooses for you.

## What It Is

- A personal feed reader you control
- Chronological posts from accounts you choose
- No algorithmic ranking, no trending, no recommendations
- A clean, quiet interface that gets out of the way

## What It Isn’t

- A social network
- A publisher growth tool
- A feed that optimizes for engagement

## Setup

### Prerequisites

- Node.js 18+
- A `twitterapi.io` API key if you want X posts
- Optional: a Vercel account to deploy

### 1) Install

```bash
git clone https://github.com/YOUR_USERNAME/clean-feed.git
cd clean-feed
npm install
```

### 2) Choose Accounts

Copy the example file and add the accounts you want to follow.

```bash
cp accounts.example.json accounts.json
```

Example format (X only or X + YouTube):

```json
[
  {
    "person": "Example Creator",
    "accounts": [
      { "platform": "x", "handle": "example" },
      { "platform": "youtube", "handle": "example", "channelId": "UCxxxxxxxxxxxxxxxxxxxxx" }
    ]
  }
]
```

### 3) Add API Key (X Only)

```bash
cp .env.example .env
```

Then add your key to `.env`:

```
TWITTERAPI_IO_KEY=your_api_key_here
```

### 4) Run Locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### 5) Deploy (Optional)

```bash
vercel
vercel env add TWITTERAPI_IO_KEY
vercel --prod
```

---

If you want to extend Clean Feed, keep the README high‑level and user‑focused. The implementation details live in code and assistant docs.
