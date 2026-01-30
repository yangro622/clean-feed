# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## User Preferences

- When the user says "remember" something, save it to this CLAUDE.md file
- Track TODOs as GitHub Issues (use `gh issue create` and `gh issue list`)
- When closing issues, link the commit hash that resolved it
- User has no prior frontend experience - explain frontend concepts in beginner-friendly terms

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Start local dev server (uses vercel dev)
vercel           # Deploy to Vercel
```

## Architecture

This is a minimal Twitter/X feed reader using twitterapi.io.

**Backend** (`api/feed.js`): Vercel serverless function that:
- Reads Twitter handles from `TWITTER_ACCOUNTS` env var (or `accounts.json` locally)
- Uses twitterapi.io API ($0.15/1k tweets) with built-in cost controls (max $1/request)
- Filters posts to last 7 days, returns sorted by newest first
- Skips retweets (only original posts)
- Caches responses for 5 minutes (`s-maxage=300`)

**Frontend** (`public/index.html`): Single-page vanilla HTML/CSS/JS that calls `/api/feed` and renders posts.

**Configuration**:
- `accounts.json`: Array of Twitter usernames (local dev only, gitignored)
- `.env`: Contains `TWITTERAPI_IO_KEY` (gitignored)
- `vercel.json`: Routes `/api/*` to serverless functions, everything else to `public/`

## Key Design Decisions

- No database—fetches fresh on each load
- No auth—personal use only
- No infinite scroll—renders all posts from last 7 days at once
- twitterapi.io for reliable access (switched from Twitter API v2 due to cost/access issues)

## Security

- **Never paste secrets (API tokens, keys) in chat** - instead, provide commands for the user to run themselves
- `.env` and `accounts.json` are gitignored to keep secrets and follow lists private
- Required secret: `TWITTERAPI_IO_KEY` (twitterapi.io API key)
- On Vercel, use environment variables (stored encrypted)

## Session Workflow

Each Claude Code session should follow this workflow for code changes:

### 1. Start of Session: Identify the Objective

- Check `gh issue list` for existing issues
- If working on an existing issue, confirm which one
- If new work, create an issue first: `gh issue create`
- For exploration/discussion only (no code changes), skip this workflow

### 2. Create a Feature Branch

Before making code changes, create and switch to a feature branch:

```bash
git checkout -b issue-{number}-{short-description}
# Example: git checkout -b issue-14-quoted-tweets
```

### 3. During Work

- Commit incrementally as progress is made
- Use clear commit messages referencing the issue: "Add quoted tweet rendering (#14)"
- Test locally: `TEST_MODE=1 npm run dev` (auto-finds available port, uses single account)

### 4. End of Session: Confirm Completion

Before merging, **ask the user**:
- "Work on #{issue} is complete. Ready to merge to main and close the issue?"

Only after user confirmation:
```bash
git checkout main
git merge issue-{number}-{short-description}
git push
gh issue close {number} --comment "Resolved in {commit-hash}"
git branch -d issue-{number}-{short-description}
```

### Quick Fixes (Escape Hatch)

For trivial changes (typos, one-liners), the user may say "quick fix" to skip branching. Commit directly to main with a clear message.

### Multiple Sessions

Multiple Claude sessions can run in parallel - each on its own branch. The dev server auto-finds available ports, so no manual port configuration needed.
