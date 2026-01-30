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

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
};

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

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

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
});
