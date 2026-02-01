// Shared mock data utilities for TEST_MODE
// Used by /api/feed, /api/feed-stream, and /api/feed-sync

const mockFeed = require('./feed.json');

/**
 * Get mock feed data with timestamps adjusted to appear recent
 * @returns {Object} Feed data matching the real API response format
 */
function getMockFeed() {
  const now = new Date();

  const posts = mockFeed.posts.map((post, i) => ({
    ...post,
    date: new Date(now - i * 30 * 60 * 1000).toISOString() // 30 min apart
  }));

  return {
    updated: now.toISOString(),
    count: posts.length,
    posts,
    _meta: {
      ...mockFeed._meta,
      estimatedCost: '$0.0000'
    }
  };
}

/**
 * Get mock accounts list
 * @returns {string[]} Array of mock usernames
 */
function getMockAccounts() {
  return mockFeed._meta.accounts;
}

/**
 * Get mock feed-sync data for cursor-based sync endpoint
 * Simulates bidirectional sync with since/until filtering
 * @param {Object} params - Query parameters
 * @param {string} params.since - ISO timestamp for "load newer"
 * @param {string} params.until - ISO timestamp for "load older"
 * @param {string} params.cursor - Pagination cursor (ignored in mock)
 * @returns {Object} Sync response with tweets array
 */
function getMockFeedSync({ since, until, cursor } = {}) {
  const now = new Date();

  // Generate mock tweets spanning multiple days for testing
  const allPosts = [];
  const accounts = getMockAccounts();

  // Generate 20 mock tweets over 5 days
  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(i / 4); // 4 tweets per day
    const hoursOffset = (i % 4) * 6; // Spread throughout day
    const postDate = new Date(now - daysAgo * 24 * 60 * 60 * 1000 - hoursOffset * 60 * 60 * 1000);
    const account = accounts[i % accounts.length];

    allPosts.push({
      id: `mock_${1000 + i}`,
      platform: 'twitter',
      username: account,
      text: `Mock tweet #${i + 1} from @${account} - generated for sync testing`,
      date: postDate.toISOString(),
      link: `https://x.com/${account}/status/mock_${1000 + i}`,
      images: [],
      urlMap: {},
      quotedTweet: null,
    });
  }

  // Filter by since/until
  let filteredPosts = allPosts;
  if (since) {
    const sinceDate = new Date(since);
    filteredPosts = filteredPosts.filter(p => new Date(p.date) > sinceDate);
  }
  if (until) {
    const untilDate = new Date(until);
    filteredPosts = filteredPosts.filter(p => new Date(p.date) < untilDate);
  }

  // Sort newest first
  filteredPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    tweets: filteredPosts,
    nextCursor: null,
    hasMore: false,
    direction: since ? 'newer' : (until ? 'older' : 'initial'),
    _meta: {
      tweetsFetched: filteredPosts.length,
      estimatedCost: '$0.0000',
      accounts: accounts.length,
      query: 'mock query'
    }
  };
}

module.exports = {
  getMockFeed,
  getMockAccounts,
  getMockFeedSync
};
