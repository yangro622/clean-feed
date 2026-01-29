const Parser = require('rss-parser');

// Accounts from environment variable (comma-separated) or fallback to file
const accounts = process.env.TWITTER_ACCOUNTS
  ? process.env.TWITTER_ACCOUNTS.split(',').map(s => s.trim())
  : require('../accounts.json');

const NITTER_INSTANCES = [
  'nitter.privacydev.net',
  'nitter.poast.org',
  'nitter.woodland.cafe',
  'nitter.mint.lgbt',
];

const parser = new Parser({
  customFields: {
    item: ['pubDate'],
  },
});

async function fetchFeed(username) {
  const errors = [];

  for (const instance of NITTER_INSTANCES) {
    const url = `https://${instance}/${username}/rss`;
    try {
      const feed = await parser.parseURL(url);
      return feed.items.map(item => ({
        username,
        text: item.contentSnippet || item.content || item.title,
        html: item.content,
        date: new Date(item.pubDate),
        link: item.link,
      }));
    } catch (err) {
      errors.push(`${instance}: ${err.message}`);
      continue;
    }
  }

  console.error(`Failed to fetch @${username}:`, errors);
  return [];
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const feedPromises = accounts.map(fetchFeed);
    const feeds = await Promise.all(feedPromises);

    const allPosts = feeds
      .flat()
      .filter(post => post.date > oneDayAgo)
      .sort((a, b) => b.date - a.date);

    res.json({
      updated: new Date().toISOString(),
      count: allPosts.length,
      posts: allPosts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
