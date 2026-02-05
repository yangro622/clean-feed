// Cursor-based sync endpoint using twitterapi.io advanced_search
// Supports bidirectional sync: since (load newer) and until (load older)

const { getAccountCount, getTwitterHandles, getYouTubeAccounts } = require('../lib/accounts');
const { fetchYouTubePosts } = require('../lib/youtube');

const COST_PER_1000_TWEETS = 0.15;
const MAX_TWEETS_PER_REQUEST = 6666; // ~$1.00 max
const YOUTUBE_LOOKBACK_DAYS = 30;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache'); // Sync endpoint should never be cached

  // TEST_MODE: return mock data
  if (process.env.TEST_MODE) {
    console.log('[feed-sync] TEST_MODE: returning mock data');
    const { getMockFeedSync } = require('../mocks');
    const { since, until, cursor } = req.query;
    return res.json(getMockFeedSync({ since, until, cursor }));
  }

  const startTime = Date.now();
  const { since, until, cursor } = req.query;
  const twitterAccounts = getTwitterHandles();
  const youtubeAccounts = getYouTubeAccounts();
  const accountCount = getAccountCount();
  console.log(`[feed-sync] START since=${since || 'none'} until=${until || 'none'} cursor=${cursor ? 'yes' : 'no'} accounts=${accountCount}`);

  const apiKey = process.env.TWITTERAPI_IO_KEY;
  if (twitterAccounts.length > 0 && !apiKey) {
    console.log('[feed-sync] ERROR no_api_key');
    return res.status(500).json({ error: 'TWITTERAPI_IO_KEY not configured' });
  }

  if (twitterAccounts.length === 0 && youtubeAccounts.length === 0) {
    console.log('[feed-sync] ERROR no_accounts');
    return res.status(400).json({ error: 'No accounts configured' });
  }

  try {
    const allPosts = [];
    let nextCursor = cursor || null;
    let hasMore = false;
    let totalTweetsFetched = 0;

    // Build advanced_search query: "(from:user1 OR from:user2) since:TIMESTAMP"
    // Use parentheses to ensure proper grouping of OR clauses
    let query = null;
    if (twitterAccounts.length > 0) {
      const fromClauses = twitterAccounts.map(u => `from:${u}`).join(' OR ');
      query = `(${fromClauses})`;

      // Add time filters
      if (since) {
        // Format: YYYY-MM-DD_HH:MM:SS_UTC
        const sinceDate = new Date(since);
        const formatted = formatDateForTwitter(sinceDate);
        query += ` since:${formatted}`;
      }
      if (until) {
        const untilDate = new Date(until);
        const formatted = formatDateForTwitter(untilDate);
        query += ` until:${formatted}`;
      }

      // Exclude retweets
      query += ' -filter:retweets';

      console.log(`[feed-sync] query="${query.substring(0, 100)}..."`);

      hasMore = true;

      // Paginate through results
      while (hasMore && totalTweetsFetched < MAX_TWEETS_PER_REQUEST) {
        const url = new URL('https://api.twitterapi.io/twitter/tweet/advanced_search');
        url.searchParams.set('query', query);
        url.searchParams.set('queryType', 'Latest');
        if (nextCursor) {
          url.searchParams.set('cursor', nextCursor);
        }

        const response = await fetch(url.toString(), {
          headers: { 'X-API-Key': apiKey }
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error');
          console.error(`[feed-sync] API_ERROR status=${response.status} body=${errorText.substring(0, 500)}`);
          return res.status(response.status).json({
            error: `API error: ${response.status}`,
            details: errorText.substring(0, 200)
          });
        }

        const data = await response.json();

        // Check for error in response
        if (data.error || (data.status && data.status !== 'success')) {
          console.error(`[feed-sync] API_FAILED status=${data.status} error=${data.error} response=${JSON.stringify(data).substring(0, 500)}`);
          return res.status(500).json({
            error: 'API request failed',
            details: data.message || data.error || 'Unknown error',
            status: data.status
          });
        }

        // advanced_search returns {tweets: [...], has_next_page, next_cursor} directly
        const tweets = data.tweets || [];
        totalTweetsFetched += tweets.length;

        for (const tweet of tweets) {
          const post = transformTweet(tweet);
          if (post) {
            // Validate that tweet is from a followed account
            if (!twitterAccounts.includes(post.username)) {
              console.warn(`[feed-sync] FILTERED unexpected account: @${post.username} - "${post.text.substring(0, 60)}"`);
              continue;
            }
            allPosts.push(post);
          }
        }

        // Check pagination
        hasMore = data.has_next_page === true;
        nextCursor = data.next_cursor || null;

        // If no tweets returned, stop
        if (tweets.length === 0) {
          hasMore = false;
        }
      }
    }

    if (youtubeAccounts.length > 0) {
      const youtubePosts = await fetchYouTubePosts({
        accounts: youtubeAccounts,
        since,
        lookbackDays: YOUTUBE_LOOKBACK_DAYS,
      });
      allPosts.push(...youtubePosts);
    }

    // Sort by date, newest first
    allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    const estimatedCost = (totalTweetsFetched / 1000) * COST_PER_1000_TWEETS;
    const duration = Date.now() - startTime;
    const twitterPostCount = allPosts.filter(post => post.platform === 'twitter').length;
    const filtered = totalTweetsFetched - twitterPostCount;
    console.log(`[feed-sync] DONE tweets=${totalTweetsFetched} posts=${allPosts.length} filtered=${filtered} cost=$${estimatedCost.toFixed(4)} hasMore=${hasMore} duration=${duration}ms`);

    res.json({
      tweets: allPosts,
      nextCursor: hasMore ? nextCursor : null,
      hasMore,
      direction: since ? 'newer' : (until ? 'older' : 'initial'),
      _meta: {
        tweetsFetched: totalTweetsFetched,
        estimatedCost: `$${estimatedCost.toFixed(4)}`,
        accounts: accountCount,
        query: query ? query.substring(0, 200) : 'youtube-only'
      }
    });
  } catch (err) {
    console.error(`[feed-sync] FATAL error=${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// Format date for Twitter search: YYYY-MM-DD_HH:MM:SS_UTC
function formatDateForTwitter(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}_${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}_UTC`;
}

function getConversationId(tweet) {
  return (
    tweet.conversation_id ||
    tweet.conversationId ||
    tweet.conversation_id_str ||
    tweet.conversationIdStr ||
    null
  );
}

function getInReplyToStatusId(tweet) {
  return (
    tweet.in_reply_to_status_id ||
    tweet.in_reply_to_id ||
    tweet.inReplyToId ||
    tweet.inReplyToStatusId ||
    tweet.in_reply_to_status_id_str ||
    tweet.inReplyToStatusIdStr ||
    null
  );
}

// Transform API tweet to our post format
function transformTweet(tweet) {
  if (!tweet) return null;

  // Extract media URLs
  const media = tweet.extendedEntities?.media || tweet.entities?.media || [];
  const images = media
    .filter(m => m.type === 'photo')
    .map(m => m.media_url_https);

  // Extract URL mappings (t.co -> real URL)
  const urlMap = {};
  (tweet.entities?.urls || []).forEach(u => {
    urlMap[u.url] = u.expanded_url || u.url;
  });

  return {
    id: tweet.id,
    platform: 'twitter',
    username: tweet.author?.userName,
    text: tweet.text,
    date: new Date(tweet.createdAt).toISOString(),
    link: tweet.url || `https://x.com/${tweet.author?.userName}/status/${tweet.id}`,
    conversationId: getConversationId(tweet),
    inReplyToStatusId: getInReplyToStatusId(tweet),
    images,
    urlMap,
    quotedTweet: tweet.quoted_tweet ? {
      username: tweet.quoted_tweet.author?.userName,
      text: tweet.quoted_tweet.text,
      link: tweet.quoted_tweet.url,
    } : null,
  };
}
