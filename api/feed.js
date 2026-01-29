const { TwitterApi } = require('twitter-api-v2');

// Accounts from environment variable (comma-separated) or fallback to file
const accounts = process.env.TWITTER_ACCOUNTS
  ? process.env.TWITTER_ACCOUNTS.split(',').map(s => s.trim())
  : require('../accounts.json');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    return res.status(500).json({ error: 'TWITTER_BEARER_TOKEN not configured' });
  }

  const client = new TwitterApi(bearerToken);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const allPosts = [];

    for (const username of accounts) {
      try {
        // Get user ID from username
        const user = await client.v2.userByUsername(username);
        if (!user.data) {
          console.error(`User not found: @${username}`);
          continue;
        }

        // Get recent tweets
        const tweets = await client.v2.userTimeline(user.data.id, {
          max_results: 20,
          'tweet.fields': ['created_at', 'text'],
          exclude: ['retweets', 'replies'],
        });

        if (tweets.data?.data) {
          for (const tweet of tweets.data.data) {
            const date = new Date(tweet.created_at);
            if (date > oneDayAgo) {
              allPosts.push({
                username,
                text: tweet.text,
                date,
                link: `https://x.com/${username}/status/${tweet.id}`,
              });
            }
          }
        }
      } catch (err) {
        console.error(`Failed to fetch @${username}:`, err.message);
      }
    }

    // Sort by date, newest first
    allPosts.sort((a, b) => b.date - a.date);

    res.json({
      updated: new Date().toISOString(),
      count: allPosts.length,
      posts: allPosts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
