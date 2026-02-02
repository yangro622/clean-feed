const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env file from project root
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  }
}

const feedHandler = require('./api/feed.js');
const feedStreamHandler = require('./api/feed-stream.js');
const feedSyncHandler = require('./api/feed-sync.js');
const balanceHandler = require('./api/balance.js');

const BASE_PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
};

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  // API stream route (SSE)
  if (req.url === '/api/feed-stream') {
    try {
      await feedStreamHandler(req, res);
    } catch (err) {
      console.error('Stream error:', err);
      res.end();
    }
    return;
  }

  // Balance API route
  if (req.url === '/api/balance') {
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };

    try {
      await balanceHandler(req, res);
    } catch (err) {
      console.error('Balance API error:', err);
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // Feed sync API route (with query params)
  if (req.url.startsWith('/api/feed-sync')) {
    // Parse query params
    const url = new URL(req.url, `http://localhost`);
    req.query = Object.fromEntries(url.searchParams);

    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };

    try {
      await feedSyncHandler(req, res);
    } catch (err) {
      console.error('Feed sync API error:', err);
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // API route
  if (req.url === '/api/feed') {
    // Add Express-like methods for Vercel serverless compatibility
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };

    try {
      await feedHandler(req, res);
    } catch (err) {
      console.error('API error:', err);
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // Static files from public/
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  try {
    const content = fs.readFileSync(filePath);
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'text/plain');
    res.end(content);
  } catch (err) {
    res.statusCode = 404;
    res.end('Not found');
  }
});

function startServer(port) {
  server.listen(port, () => {
    console.log(`Dev server running at http://localhost:${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying ${port + 1}...`);
      server.removeAllListeners('error');
      startServer(port + 1);
    } else {
      throw err;
    }
  });
}

startServer(BASE_PORT);
