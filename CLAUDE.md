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

Each Claude Code session should follow this workflow for code changes.

**IMPORTANT**: Multiple sessions share the same local filesystem. Use git worktrees to isolate each session's work.

### 1. Start of Session: Check Location & Identify Work

First, check if you're in the main repo or a worktree:

```bash
git worktree list   # See all worktrees
pwd                 # Check current directory
```

- If in `/Users/robert/projects/clean-feed` (main repo): create a worktree for your issue
- If already in a worktree (e.g., `/Users/robert/projects/clean-feed-issue-15`): continue working there
- For exploration/discussion only (no code changes), skip worktree setup

Check for existing issues: `gh issue list`

### 2. Create a Worktree for Your Issue

Before making code changes, create an isolated worktree:

```bash
# From the main repo directory
cd /Users/robert/projects/clean-feed
git worktree add ../clean-feed-issue-{number} -b issue-{number}-{short-description}
cd ../clean-feed-issue-{number}

# Example:
git worktree add ../clean-feed-issue-15 -b issue-15-platforms
cd ../clean-feed-issue-15
```

This creates a separate directory with its own branch. Other sessions won't interfere.

### 3. During Work

- Work entirely within your worktree directory
- Commit incrementally as progress is made
- Use clear commit messages referencing the issue: "Add quoted tweet rendering (#14)"
- Test locally: `TEST_MODE=1 npm run dev` (auto-finds available port)

### 4. End of Session: Confirm Completion

Before merging, **ask the user**:
- "Work on #{issue} is complete. Ready to merge to main and close the issue?"

Only after user confirmation:
```bash
# From your worktree directory
git push -u origin issue-{number}-{short-description}

# Switch to main repo to merge
cd /Users/robert/projects/clean-feed
git checkout main
git pull
git merge issue-{number}-{short-description}
git push
gh issue close {number} --comment "Resolved in {commit-hash}"

# Clean up worktree and branch
git worktree remove ../clean-feed-issue-{number}
git branch -d issue-{number}-{short-description}
```

### Quick Fixes (Escape Hatch)

For trivial changes (typos, one-liners), the user may say "quick fix" to skip worktree setup. Work directly in main repo on main branch.

### Parallel Sessions

Multiple Claude sessions can run in parallel - each in its own worktree directory:
- `/Users/robert/projects/clean-feed` (main repo, for quick fixes)
- `/Users/robert/projects/clean-feed-issue-15` (session working on issue 15)
- `/Users/robert/projects/clean-feed-issue-17` (session working on issue 17)

The dev server auto-finds available ports, so multiple sessions can run `npm run dev` simultaneously.
