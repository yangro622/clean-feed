# AGENTS.md

Quick context for Codex or other assistants.

## What This Repo Is

Clean Feed is a minimal, personal feed reader for X and YouTube. It prioritizes high-signal, chronological posts from accounts the user chooses.

## Where Things Live

- `public/index.html`: the entire frontend (HTML/CSS/JS)
- `api/`: serverless endpoints for feed data
- `lib/`: helpers for accounts and YouTube RSS
- `accounts.json`: who to follow (supports groups + multiple platforms)

## Docs

- `README.md` is the public story and setup guide. Keep it high-level.
- `CLAUDE.md` contains assistant-only guidance and commands.

## Notes

- X data comes from `twitterapi.io`.
- YouTube data comes from RSS feeds (channel `channelId`).
