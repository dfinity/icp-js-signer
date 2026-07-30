// Minimal static file server for the Playwright e2e fixtures. Playwright's
// `webServer` launches it so the specs load the fixture pages over real HTTP:
// the postMessage and URL-redirect transports key off `window.origin` and
// cross-window messaging, neither of which exists under `file://`. Plain Node
// built-ins — no static-server dependency to install or audit.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const ROOT = resolve(process.argv[2] ?? '.');
const PORT = Number(process.env.PORT ?? 3456);

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const requested = decodeURIComponent(pathname.endsWith('/') ? `${pathname}index.html` : pathname);
  const filePath = normalize(join(ROOT, requested));

  // Never serve outside the root, whatever `..` the request smuggles in.
  if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`e2e static server on http://127.0.0.1:${PORT} (root: ${ROOT})`);
});
