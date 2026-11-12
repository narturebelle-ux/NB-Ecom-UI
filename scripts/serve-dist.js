// Serves the built app in dist/frontend/browser, the same folder Vercel deploys.
// Used by `npm run serve:dev` / `serve:staging` / `serve:prod`, which build first and then call this.
// Any path that isn't a real file gets index.html, like the rewrite in vercel.json, so refreshing on
// a page such as /journey still works. Port: PORT env var, else 4200.
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'dist', 'frontend', 'browser');
const port = Number(process.env.PORT) || 4200;
const target = process.argv[2] || 'build';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf'
};

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error(`No build found in ${root}. Run a build first.`);
  process.exit(1);
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function resolve(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  } catch {
    return null;
  }
  const file = path.resolve(root, '.' + decoded);
  // Never serve anything outside the build folder.
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  if (isFile(file)) return file;
  const nested = path.join(file, 'index.html'); // prerendered pages
  if (isFile(nested)) return nested;
  return null;
}

http
  .createServer((req, res) => {
    const found = resolve(req.url || '/');
    // Missing files that look like assets (have an extension) get a real 404 instead of the app page.
    if (!found && path.extname((req.url || '').split('?')[0])) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const file = found || path.join(root, 'index.html');
    const type = types[path.extname(file).toLowerCase()] || 'application/octet-stream';
    // Hashed bundles can be cached; HTML must always be fresh so a rebuild shows up on refresh.
    const cache = type.startsWith('text/html') ? 'no-cache' : 'public, max-age=31536000, immutable';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache });
    fs.createReadStream(file).pipe(res);
  })
  .on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the other server, or set PORT to another number.`);
    } else {
      console.error(err.message);
    }
    process.exit(1);
  })
  .listen(port, () => {
    console.log(`Serving the ${target} build from dist/frontend/browser at http://localhost:${port}`);
    console.log('Press Ctrl+C to stop.');
  });
