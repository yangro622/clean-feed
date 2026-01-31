module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60'); // 1 minute cache

  const apiKey = process.env.TWITTERAPI_IO_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.twitterapi.io/oapi/my/info', {
      headers: { 'X-API-Key': apiKey }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch balance' });
    }

    const data = await response.json();

    // Convert credits to dollars (appears to be credits / 100000 = dollars)
    const credits = data.recharge_credits + (data.total_bonus_credits || 0);
    const dollars = credits / 100000;

    res.json({
      credits,
      balance: `$${dollars.toFixed(2)}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
