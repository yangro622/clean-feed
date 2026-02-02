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
 * Uses the rich mock data from feed.json, spread across multiple days
 * @param {Object} params - Query parameters
 * @param {string} params.since - ISO timestamp for "load newer"
 * @param {string} params.until - ISO timestamp for "load older"
 * @param {string} params.cursor - Pagination cursor (ignored in mock)
 * @returns {Object} Sync response with tweets array
 */
function getMockFeedSync({ since, until, cursor } = {}) {
  // Use a fixed "now" based on today at midnight for stable mock data
  // This prevents tweets from shifting on every refresh
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  // Use the rich mock data from feed.json, spread over multiple days
  const basePosts = mockFeed.posts;
  const allPosts = [];

  // Create 3 "days" worth of the rich mock posts (24 total tweets over 3 days)
  for (let day = 0; day < 3; day++) {
    for (let i = 0; i < basePosts.length; i++) {
      const post = basePosts[i];
      const hoursAgo = day * 24 + i * 3; // Spread posts 3 hours apart
      const postDate = new Date(today - hoursAgo * 60 * 60 * 1000);

      allPosts.push({
        id: `sync_${day}_${i}`,
        platform: 'twitter',
        username: post.username,
        text: post.text,
        date: postDate.toISOString(),
        link: post.link.replace('/status/', `/status/sync_${day}_`),
        images: post.images || [],
        urlMap: post.urlMap || {},
        quotedTweet: post.quotedTweet || null,
      });
    }
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
    hasMore: !until || filteredPosts.length > 0, // hasMore=true if we might have older posts
    direction: since ? 'newer' : (until ? 'older' : 'initial'),
    _meta: {
      tweetsFetched: filteredPosts.length,
      estimatedCost: '$0.0000',
      accounts: mockFeed._meta.accounts.length,
      query: 'mock query'
    }
  };
}

module.exports = {
  getMockFeed,
  getMockAccounts,
  getMockFeedSync
};
