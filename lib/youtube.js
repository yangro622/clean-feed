const Parser = require('rss-parser');

const parser = new Parser();

const getVideoId = (item) => {
  if (!item) return null;
  if (item.id && typeof item.id === 'string') {
    const parts = item.id.split(':');
    const maybeId = parts[parts.length - 1];
    if (maybeId) return maybeId;
  }

  if (item.link) {
    try {
      const url = new URL(item.link);
      const v = url.searchParams.get('v');
      if (v) return v;
    } catch {
      // ignore
    }
  }

  return null;
};

const getPublishedDate = (item) => {
  if (!item) return null;
  const raw = item.isoDate || item.pubDate || item.published || item.updated;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const withinRange = (date, since, until) => {
  if (!date) return false;
  if (since && date <= since) return false;
  if (until && date >= until) return false;
  return true;
};

const buildThumbnailUrl = (videoId) =>
  videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;

const buildFeedUrl = (channelId) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

const fetchChannelPosts = async ({ handle, channelId, since, until }) => {
  if (!channelId) {
    console.warn(`[youtube] Missing channelId for @${handle}`);
    return [];
  }

  const feedUrl = buildFeedUrl(channelId);
  try {
    const feed = await parser.parseURL(feedUrl);
    const posts = [];

    for (const item of feed.items || []) {
      const published = getPublishedDate(item);
      if (!withinRange(published, since, until)) continue;

      const videoId = getVideoId(item);
      const thumbnail = buildThumbnailUrl(videoId);
      const link = item.link || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null);
      if (!link) continue;

      posts.push({
        id: videoId ? `yt_${videoId}` : `yt_${channelId}_${item.guid || item.link}`,
        platform: 'youtube',
        username: handle,
        text: item.title || 'Untitled',
        date: published ? published.toISOString() : new Date().toISOString(),
        link,
        images: [],
        videos: thumbnail ? [thumbnail] : [],
        urlMap: {},
        quotedTweet: null,
      });
    }

    return posts;
  } catch (err) {
    console.error(`[youtube] Failed to fetch ${handle} feed: ${err.message}`);
    return [];
  }
};

const fetchYouTubePosts = async ({ accounts = [], since, until, lookbackDays }) => {
  const lookback = Number.isFinite(lookbackDays) && lookbackDays > 0
    ? new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
    : null;
  const sinceDate = since ? new Date(since) : null;
  const effectiveSince = lookback
    ? (sinceDate && sinceDate < lookback ? sinceDate : lookback)
    : sinceDate;
  const untilDate = lookback ? null : (until ? new Date(until) : null);

  const posts = [];
  for (const account of accounts) {
    const accountPosts = await fetchChannelPosts({
      handle: account.handle,
      channelId: account.channelId,
      since: effectiveSince,
      until: untilDate,
    });
    posts.push(...accountPosts);
  }

  return posts;
};

module.exports = {
  fetchYouTubePosts,
};
