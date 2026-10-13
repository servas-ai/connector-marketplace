#!/usr/bin/env node
// Minimaler statischer Server für dist/ mit gzip – bildet GitHub Pages (Content-Encoding gzip, Cache) für Lighthouse/E2E nach.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const root = path.resolve(process.argv[2] || 'dist'); const port = Number(process.argv[3] || 4180);
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webp': 'image/webp', '.txt': 'text/plain' };
http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('404'); }
  const ext = path.extname(p); const type = T[ext] || 'application/octet-stream';
  const h = { 'content-type': type, 'cache-control': ext === '.html' ? 'max-age=600' : 'max-age=31536000' };
  const body = fs.readFileSync(p);
  if (/text|javascript|json|svg/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '')) { res.writeHead(200, { ...h, 'content-encoding': 'gzip' }); return res.end(zlib.gzipSync(body)); }
  res.writeHead(200, h); res.end(body);
}).listen(port, '127.0.0.1');
