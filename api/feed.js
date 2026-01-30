// Accounts from environment variable (comma-separated) or fallback to file
// Use TEST_MODE=1 to test with a single account
const accounts = process.env.TEST_MODE
  ? ['elonmusk']
  : process.env.TWITTER_ACCOUNTS
    ? process.env.TWITTER_ACCOUNTS.split(',').map(s => s.trim())
    : require('../accounts.json');

// Cost control settings
const COST_PER_1000_TWEETS = 0.15; // $0.15 per 1,000 tweets
const MAX_COST_PER_REQUEST = 1.00; // $1.00 max per request
const MAX_TWEETS_PER_REQUEST = Math.floor((MAX_COST_PER_REQUEST / COST_PER_1000_TWEETS) * 1000); // ~6,666 tweets

// Rate limit: free tier = 1 request per 5 seconds
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=86400'); // 24 hour CDN cache

  const apiKey = process.env.TWITTERAPI_IO_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'TWITTERAPI_IO_KEY not configured' });
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const allPosts = [];
    let totalTweetsFetched = 0;

    // Fetch tweets for each account
    for (let i = 0; i < accounts.length; i++) {
      const username = accounts[i];

      // Rate limit: wait 5s between requests (skip for first)
      if (i > 0) await sleep(5000);

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
          console.error(`API error for @${username}: ${response.status}`);
          continue;
        }

        const data = await response.json();

        if (data.status !== 'success' || !data.data?.tweets) {
          console.error(`No tweets for @${username}`);
          continue;
        }

        const tweets = data.data.tweets;
        totalTweetsFetched += tweets.length;

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

            // Extract URL mappings (t.co -> real URL)
            const urlMap = {};
            (tweet.entities?.urls || []).forEach(u => {
              urlMap[u.url] = u.expanded_url || u.url;
            });

            allPosts.push({
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
            });
          }
        }
      } catch (err) {
        console.error(`Failed to fetch @${username}:`, err.message);
      }
    }

    // Sort by date, newest first
    allPosts.sort((a, b) => b.date - a.date);

    // Calculate estimated cost
    const estimatedCost = (totalTweetsFetched / 1000) * COST_PER_1000_TWEETS;

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
    res.status(500).json({ error: err.message });
  }
};
