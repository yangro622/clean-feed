# Clean Feed: Personal Twitter Without the Poison

## What I'm Building
A minimal, personal feed reader that shows recent posts from accounts I choose. No algorithm, no recommendations, no infinite scroll, no short-form video. Just chronological text posts from people I deliberately follow.

## Core Requirements
- Hardcoded list of 10-20 Twitter/X accounts (I'll provide the list)
- Pull last 24 hours of posts
- Display chronologically (newest first)
- Single page, no infinite scroll—just render what exists
- Mobile-friendly (I'll access from phone)
- Deployable to Vercel or similar free tier

## Technical Approach
- Use RSS via Nitter instances (free, no API key) as primary method
- Fallback: if Nitter is unreliable, advise on Twitter API options
- Simple frontend: vanilla HTML/CSS/JS or lightweight React
- No database needed—fetch fresh on each load
- No auth needed—this is for me only

## What I Don't Want
- No algorithmic ranking
- No "smart" features
- No user accounts or social features
- No caching complexity for v1
- No analytics

## Definition of Done
I open this URL on my phone instead of Twitter. That's it.

## My Accounts List
[I'll add these]
