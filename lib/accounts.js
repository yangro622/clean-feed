const normalizeHandle = (handle) => {
  if (!handle) return null;
  if (typeof handle !== 'string') return null;
  return handle.startsWith('@') ? handle.slice(1) : handle;
};

const normalizePlatform = (platform) => {
  const raw = (platform || '').toLowerCase();
  if (raw === 'twitter' || raw === 'x') return 'x';
  if (raw === 'youtube' || raw === 'yt') return 'youtube';
  return raw || 'x';
};

const normalizeAccountEntry = (account) => {
  if (!account) return null;
  if (typeof account === 'string') {
    return { platform: 'x', handle: normalizeHandle(account) };
  }

  const handle = normalizeHandle(account.handle || account.username || account.name);
  if (!handle) return null;

  return {
    platform: normalizePlatform(account.platform || account.source),
    handle,
    channelId: account.channelId || account.channelID || null,
    url: account.url || account.link || null,
  };
};

const normalizeAccountGroups = (accounts) => {
  if (!Array.isArray(accounts) || accounts.length === 0) return [];

  if (typeof accounts[0] === 'string') {
    return accounts
      .map((handle) => normalizeHandle(handle))
      .filter(Boolean)
      .map((handle) => ({
        person: handle,
        accounts: [{ platform: 'x', handle }],
      }));
  }

  if (accounts[0] && Array.isArray(accounts[0].accounts)) {
    return accounts
      .map((group) => {
        const groupAccounts = (group.accounts || [])
          .map(normalizeAccountEntry)
          .filter(Boolean);

        if (groupAccounts.length === 0) return null;

        return {
          person: group.person || group.name || groupAccounts[0].handle,
          accounts: groupAccounts,
        };
      })
      .filter(Boolean);
  }

  return accounts
    .map((account) => {
      const normalized = normalizeAccountEntry(account);
      if (!normalized) return null;
      return {
        person: account.person || account.name || normalized.handle,
        accounts: [normalized],
      };
    })
    .filter(Boolean);
};

const applyTwitterOverride = (groups) => {
  const override = process.env.TWITTER_ACCOUNTS;
  if (!override) return groups;

  const handles = override
    .split(',')
    .map((handle) => normalizeHandle(handle.trim()))
    .filter(Boolean);

  const nonTwitterGroups = groups
    .map((group) => ({
      person: group.person,
      accounts: group.accounts.filter((account) => normalizePlatform(account.platform) !== 'x'),
    }))
    .filter((group) => group.accounts.length > 0);

  const twitterGroups = handles.map((handle) => ({
    person: handle,
    accounts: [{ platform: 'x', handle }],
  }));

  return [...twitterGroups, ...nonTwitterGroups];
};

const getAccountGroups = () => {
  // eslint-disable-next-line global-require
  const raw = require('../accounts.json');
  const normalized = normalizeAccountGroups(raw);
  return applyTwitterOverride(normalized);
};

const getAccountsByPlatform = (platform) => {
  const key = normalizePlatform(platform);
  const groups = getAccountGroups();
  return groups
    .flatMap((group) => group.accounts)
    .map((account) => ({
      ...account,
      platform: normalizePlatform(account.platform),
      handle: normalizeHandle(account.handle),
    }))
    .filter((account) => account.handle && account.platform === key);
};

const getTwitterHandles = () =>
  getAccountsByPlatform('x').map((account) => account.handle);

const getYouTubeAccounts = () =>
  getAccountsByPlatform('youtube');

const getAccountCount = () => {
  const groups = getAccountGroups();
  return groups.reduce((sum, group) => sum + group.accounts.length, 0);
};

module.exports = {
  getAccountGroups,
  getAccountsByPlatform,
  getTwitterHandles,
  getYouTubeAccounts,
  getAccountCount,
};
