// Accounts to follow (edit accounts.json to customize)
const accounts = require('../accounts.json');

// Cost control settings
const COST_PER_1000_TWEETS = 0.15; // $0.15 per 1,000 tweets
const MAX_COST_PER_REQUEST = 1.00; // $1.00 max per request
const MAX_TWEETS_PER_REQUEST = Math.floor((MAX_COST_PER_REQUEST / COST_PER_1000_TWEETS) * 1000); // ~6,666 tweets

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // TEST_MODE: return mock data without calling the real API
  if (process.env.TEST_MODE) {
    console.log('[feed] TEST_MODE: returning mock data');
    const { getMockFeed } = require('../mocks');
    return res.json(getMockFeed());
  }

  const startTime = Date.now();
  console.log(`[feed] START accounts=${accounts.length}`);

  res.setHeader('Cache-Control', 's-maxage=86400'); // 24 hour CDN cache

  const apiKey = process.env.TWITTERAPI_IO_KEY;
  if (!apiKey) {
    console.log(`[feed] ERROR no_api_key`);
    return res.status(500).json({ error: 'TWITTERAPI_IO_KEY not configured' });
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const allPosts = [];
    let totalTweetsFetched = 0;
    const fetchResults = []; // Track per-account results

    // Fetch tweets for each account
    for (let i = 0; i < accounts.length; i++) {
      const username = accounts[i];

      // Cost safety check
      if (totalTweetsFetched >= MAX_TWEETS_PER_REQUEST) {
        console.warn(`Cost limit reached: ${totalTweetsFetched} tweets fetched, stopping`);
        break;
      }

      try {
        const response = await fetch(
          `https://api.twitterapi.io/twitter/user/last_tweets?userName=${encodeURIComponent(username)}`,
          {
            headers: { 'X-API-Key': apiKey }
          }
        );

        if (!response.ok) {
          console.error(`[feed] FETCH_ERROR @${username} status=${response.status}`);
          fetchResults.push({ username, tweets: 0, status: `err_${response.status}` });
          continue;
        }

        const data = await response.json();

        if (data.status !== 'success' || !data.data?.tweets) {
          console.error(`[feed] NO_TWEETS @${username}`);
          fetchResults.push({ username, tweets: 0, status: 'no_tweets' });
          continue;
        }

        const tweets = data.data.tweets;
        totalTweetsFetched += tweets.length;
        fetchResults.push({ username, tweets: tweets.length, status: 'ok' });

        for (const tweet of tweets) {
          // Skip retweets (they start with "RT @")
          if (tweet.text?.startsWith('RT @')) continue;

          const date = new Date(tweet.createdAt);
          if (date > oneDayAgo) {
            // Extract media URLs
            const media = tweet.extendedEntities?.media || tweet.entities?.media || [];
            const images = media
              .filter(m => m.type === 'photo')
              .map(m => m.media_url_https);
            const videos = media
              .filter(m => m.type === 'video' || m.type === 'animated_gif')
              .map(m => m.media_url_https);

            // Extract URL mappings (t.co -> real URL)
          const urlMap = {};
          (tweet.entities?.urls || []).forEach(u => {
            urlMap[u.url] = u.expanded_url || u.url;
          });

          const conversationId = tweet.conversation_id || tweet.conversationId || tweet.conversation_id_str || tweet.conversationIdStr || null;
          const inReplyToStatusId =
            tweet.in_reply_to_status_id ||
            tweet.in_reply_to_id ||
            tweet.inReplyToId ||
            tweet.inReplyToStatusId ||
            tweet.in_reply_to_status_id_str ||
            tweet.inReplyToStatusIdStr ||
            null;

          allPosts.push({
            username: tweet.author?.userName || username,
            text: tweet.text,
            date,
            link: tweet.url || `https://x.com/${username}/status/${tweet.id}`,
            conversationId,
            inReplyToStatusId,
            images,
            videos,
            urlMap,
            quotedTweet: tweet.quoted_tweet ? {
              username: tweet.quoted_tweet.author?.userName,
                text: tweet.quoted_tweet.text,
                link: tweet.quoted_tweet.url,
              } : null,
            });
          }
        }
      } catch (err) {
        console.error(`[feed] NETWORK_ERROR @${username} error=${err.message}`);
        fetchResults.push({ username, tweets: 0, status: 'network_err' });
      }
    }

    // Sort by date, newest first
    allPosts.sort((a, b) => b.date - a.date);

    // Calculate estimated cost
    const estimatedCost = (totalTweetsFetched / 1000) * COST_PER_1000_TWEETS;

    const duration = Date.now() - startTime;
    const successCount = fetchResults.filter(r => r.status === 'ok').length;
    console.log(`[feed] DONE tweets=${totalTweetsFetched} posts=${allPosts.length} cost=$${estimatedCost.toFixed(4)} accounts=${successCount}/${accounts.length} duration=${duration}ms`);

    res.json({
      updated: new Date().toISOString(),
      count: allPosts.length,
      posts: allPosts,
      _meta: {
        tweetsFetched: totalTweetsFetched,
        estimatedCost: `$${estimatedCost.toFixed(4)}`,
        accountsProcessed: accounts.length,
        accounts: accounts,
      }
    });
  } catch (err) {
    console.error(`[feed] FATAL error=${err.message}`);
    res.status(500).json({ error: err.message });
  }
};
