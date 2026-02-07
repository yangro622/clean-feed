const { getAccountCount, getAccountGroups, getTwitterHandles, getYouTubeAccounts } = require('../lib/accounts');
const { fetchYouTubePosts } = require('../lib/youtube');

// Cost control settings
const COST_PER_1000_TWEETS = 0.15; // $0.15 per 1,000 tweets
const MAX_COST_PER_REQUEST = 1.00; // $1.00 max per request
const MAX_TWEETS_PER_REQUEST = Math.floor((MAX_COST_PER_REQUEST / COST_PER_1000_TWEETS) * 1000); // ~6,666 tweets
const YOUTUBE_LOOKBACK_DAYS = 30;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // TEST_MODE: return mock data without calling the real API
  if (process.env.TEST_MODE) {
    console.log('[feed] TEST_MODE: returning mock data');
    const { getMockFeed } = require('../mocks');
    return res.json(getMockFeed());
  }

  const startTime = Date.now();
  const twitterAccounts = getTwitterHandles();
  const youtubeAccounts = getYouTubeAccounts();
  const accountCount = getAccountCount();
  console.log(`[feed] START accounts=${accountCount}`);

  res.setHeader('Cache-Control', 's-maxage=86400'); // 24 hour CDN cache

  const apiKey = process.env.TWITTERAPI_IO_KEY;
  if (twitterAccounts.length > 0 && !apiKey) {
    console.log('[feed] ERROR no_api_key');
    return res.status(500).json({ error: 'TWITTERAPI_IO_KEY not configured' });
  }

  if (twitterAccounts.length === 0 && youtubeAccounts.length === 0) {
    console.log('[feed] ERROR no_accounts');
    return res.status(400).json({ error: 'No accounts configured' });
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const allPosts = [];
    let totalTweetsFetched = 0;
    const fetchResults = []; // Track per-account results

    // Fetch tweets for each account
    for (let i = 0; i < twitterAccounts.length; i++) {
      const username = twitterAccounts[i];

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
            text: tweet.note_tweet?.text || tweet.text,
            date: date.toISOString(),
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

    if (youtubeAccounts.length > 0) {
      const youtubePosts = await fetchYouTubePosts({
        accounts: youtubeAccounts,
        lookbackDays: YOUTUBE_LOOKBACK_DAYS,
      });
      allPosts.push(...youtubePosts);
    }

    // Sort by date, newest first
    allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate estimated cost
    const estimatedCost = (totalTweetsFetched / 1000) * COST_PER_1000_TWEETS;

    const duration = Date.now() - startTime;
    const successCount = fetchResults.filter(r => r.status === 'ok').length;
    console.log(`[feed] DONE tweets=${totalTweetsFetched} posts=${allPosts.length} cost=$${estimatedCost.toFixed(4)} accounts=${successCount}/${twitterAccounts.length} duration=${duration}ms`);

    res.json({
      updated: new Date().toISOString(),
      count: allPosts.length,
      posts: allPosts,
      _meta: {
        tweetsFetched: totalTweetsFetched,
        estimatedCost: `$${estimatedCost.toFixed(4)}`,
        accountsProcessed: accountCount,
        accounts: getAccountGroups(),
      }
    });
  } catch (err) {
    console.error(`[feed] FATAL error=${err.message}`);
    res.status(500).json({ error: err.message });
  }
};
