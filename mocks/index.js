// Shared mock data utilities for TEST_MODE
// Used by both /api/feed and /api/feed-stream

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

module.exports = {
  getMockFeed,
  getMockAccounts
};
