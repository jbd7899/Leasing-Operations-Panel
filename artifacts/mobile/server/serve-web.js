/**
 * Static server for Expo web build (dist-web/).
 * Serves the SPA with an index.html fallback for all unmatched routes.
 * Honors BASE_PATH for subpath deployments.
 * Zero external dependencies — uses only Node.js built-ins.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST_ROOT = path.resolve(__dirname, "..", "dist-web");
const basePath = (process.env.BASE_PATH || "").replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
};

function resolveFile(urlPath) {
  const safe = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const candidate = path.join(DIST_ROOT, safe);

  if (!candidate.startsWith(DIST_ROOT)) return null;

  if (fs.existsSync(candidate) && !fs.statSync(candidate).isDirectory()) {
    return candidate;
  }

  const withIndex = path.join(candidate, "index.html");
  if (fs.existsSync(withIndex)) return withIndex;

  return null;
}

const indexHtml = path.join(DIST_ROOT, "index.html");

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  const file = resolveFile(pathname);

  if (file) {
    const ext = path.extname(file).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "content-type": contentType });
    res.end(fs.readFileSync(file));
    return;
  }

  if (fs.existsSync(indexHtml)) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(indexHtml));
    return;
  }

  res.writeHead(503, { "content-type": "text/plain" });
  res.end(
    "Web build not found. Run `pnpm --filter @workspace/mobile run build:web` first.",
  );
});

const port = parseInt(process.env.PORT || "3001", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving Expo web build on port ${port}${basePath || ""}`);
});
