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

### 1. Start of Session: Set Up Worktree

Extract your session ID from the scratchpad path and create an isolated worktree:

```bash
# Get session ID (first 8 chars of UUID from scratchpad path)
# Scratchpad path format: /private/tmp/claude-501/.../SESSION_UUID/scratchpad
SESSION_ID=$(basename $(dirname $SCRATCHPAD_DIR) | cut -c1-8)

# Check if worktree already exists for this session
cd /Users/robert/projects/clean-feed
if git worktree list | grep -q "clean-feed-$SESSION_ID"; then
  cd ../clean-feed-$SESSION_ID
else
  git worktree add ../clean-feed-$SESSION_ID -b session-$SESSION_ID
  cd ../clean-feed-$SESSION_ID
fi
```

This creates a directory like `/Users/robert/projects/clean-feed-81a2ef7c/` unique to this session.

For exploration/discussion only (no code changes), skip worktree setup.

### 2. Identify Work

Check for existing issues: `gh issue list`

- If working on an existing issue, confirm which one
- If new work, create an issue first: `gh issue create`

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
# From your worktree directory, merge to main
cd /Users/robert/projects/clean-feed
git checkout main
git pull
git merge session-$SESSION_ID
git push
gh issue close {number} --comment "Resolved in {commit-hash}"

# Clean up worktree and branch
git worktree remove ../clean-feed-$SESSION_ID
git branch -d session-$SESSION_ID
```

### Quick Fixes (Escape Hatch)

For trivial changes (typos, one-liners), the user may say "quick fix" to skip worktree setup. Work directly in main repo on main branch.

### Parallel Sessions

Multiple Claude sessions run in parallel, each in its own worktree:
- `/Users/robert/projects/clean-feed` (main repo)
- `/Users/robert/projects/clean-feed-81a2ef7c` (session 81a2ef7c)
- `/Users/robert/projects/clean-feed-a3b5c7d9` (session a3b5c7d9)

The dev server auto-finds available ports, so multiple sessions can run `npm run dev` simultaneously.
