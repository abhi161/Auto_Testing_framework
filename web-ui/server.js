// Zero-dependency static file server for the standalone frontend.
// Usage: node server.js [port]   (default 5173)
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.argv[2]) || 5173;
const root = __dirname;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
};

http
  .createServer((req, res) => {
    const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const filePath = path.join(root, decodeURIComponent(urlPath));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    });
  })
  .listen(port, () => console.log(`NovoTest.ai web UI: http://localhost:${port}`));
