// Accounts from environment variable (comma-separated) or fallback to file
// Use TEST_MODE=1 to test with a single account and limited tweets
const accounts = process.env.TEST_MODE
  ? ['elonmusk']
  : process.env.TWITTER_ACCOUNTS
    ? process.env.TWITTER_ACCOUNTS.split(',').map(s => s.trim())
    : require('../accounts.json');

// In test mode, limit tweets per account (API always returns 20, so we slice client-side)
const TEST_TWEET_LIMIT = process.env.TEST_MODE ? 5 : Infinity;

const COST_PER_1000_TWEETS = 0.15;

module.exports = async (req, res) => {
  const startTime = Date.now();
  console.log(`[stream] START accounts=${accounts.length}`);

  // Set up Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiKey = process.env.TWITTERAPI_IO_KEY;
  if (!apiKey) {
    console.log(`[stream] ERROR no_api_key`);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'API key not configured' })}\n\n`);
    res.end();
    return;
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Send initial info
  res.write(`data: ${JSON.stringify({ type: 'start', total: accounts.length, accounts })}\n\n`);

  const allPosts = [];
  let totalTweetsFetched = 0;
  let successCount = 0;

  for (let i = 0; i < accounts.length; i++) {
    const username = accounts[i];

    // Send progress update
    res.write(`data: ${JSON.stringify({ type: 'progress', current: i + 1, total: accounts.length, username })}\n\n`);

    try {
      const response = await fetch(
        `https://api.twitterapi.io/twitter/user/last_tweets?userName=${encodeURIComponent(username)}`,
        { headers: { 'X-API-Key': apiKey } }
      );

      if (!response.ok) {
        console.error(`[stream] FETCH_ERROR @${username} status=${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.status !== 'success' || !data.data?.tweets) {
        console.error(`[stream] NO_TWEETS @${username}`);
        continue;
      }

      const tweets = data.data.tweets.slice(0, TEST_TWEET_LIMIT);
      totalTweetsFetched += tweets.length;
      successCount++;

      const newPosts = [];
      for (const tweet of tweets) {
        // Skip retweets
        if (tweet.text?.startsWith('RT @')) continue;

        const date = new Date(tweet.createdAt);
        if (date > oneDayAgo) {
          const media = tweet.extendedEntities?.media || tweet.entities?.media || [];
          const images = media.filter(m => m.type === 'photo').map(m => m.media_url_https);

          const urlMap = {};
          (tweet.entities?.urls || []).forEach(u => {
            urlMap[u.url] = u.expanded_url || u.url;
          });

          const post = {
            username: tweet.author?.userName || username,
            text: tweet.text,
            date,
            link: tweet.url || `https://x.com/${username}/status/${tweet.id}`,
            images,
            urlMap,
            quotedTweet: tweet.quoted_tweet ? {
              username: tweet.quoted_tweet.author?.userName,
              text: tweet.quoted_tweet.text,
              link: tweet.quoted_tweet.url,
            } : null,
          };
          newPosts.push(post);
          allPosts.push(post);
        }
      }

      // Send new posts for this account (sorted oldest to newest)
      if (newPosts.length > 0) {
        newPosts.sort((a, b) => new Date(a.date) - new Date(b.date));
        res.write(`data: ${JSON.stringify({ type: 'posts', username, posts: newPosts })}\n\n`);
      }

    } catch (err) {
      console.error(`[stream] NETWORK_ERROR @${username} error=${err.message}`);
    }
  }

  // Send completion (posts kept in fetch order: by account, oldest-to-newest within)
  const estimatedCost = `$${((totalTweetsFetched / 1000) * COST_PER_1000_TWEETS).toFixed(4)}`;
  const duration = Date.now() - startTime;
  console.log(`[stream] DONE tweets=${totalTweetsFetched} posts=${allPosts.length} cost=${estimatedCost} accounts=${successCount}/${accounts.length} duration=${duration}ms`);

  res.write(`data: ${JSON.stringify({
    type: 'complete',
    count: allPosts.length,
    tweetsFetched: totalTweetsFetched,
    estimatedCost,
    accounts
  })}\n\n`);

  res.end();
};
