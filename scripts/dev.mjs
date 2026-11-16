/**
 * Zero-dependency static dev server for the portal.
 * Cloud API routes are not emulated here: the portal will simply
 * report "Mode local". Use `npm run dev:vercel` for the full stack.
 */
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const BASE_PORT = Number(process.env.PORT || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".sql": "text/plain; charset=utf-8"
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const candidate = normalize(join(ROOT, decoded));
  if (candidate !== ROOT && !candidate.startsWith(ROOT + sep)) return null;
  return candidate;
}

async function resolveFile(pathname) {
  const target = safePath(pathname);
  if (!target) return null;
  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      const index = join(target, "index.html");
      const indexInfo = await stat(index);
      if (indexInfo.isFile()) return { file: index, size: indexInfo.size };
      return null;
    }
    if (info.isFile()) return { file: target, size: info.size };
  } catch {
    return null;
  }
  return null;
}

function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed");
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");

  if (url.pathname.startsWith("/api/")) {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ ok: false, error: "api-not-available", hint: "Run npm run dev:vercel" }));
    return;
  }

  resolveFile(url.pathname === "/" ? "/index.html" : url.pathname)
    .then((found) => {
      if (!found) {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end('<h1>404</h1><p>Fichier introuvable. <a href="/">Retour à l’atlas</a></p>');
        return;
      }
      const ext = extname(found.file).toLowerCase();
      const type = MIME[ext] || "application/octet-stream";
      const noCache = [".html", ".css", ".js", ".mjs", ".json"].includes(ext);
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": found.size,
        "Cache-Control": noCache ? "no-store" : "public, max-age=3600",
        "X-Content-Type-Options": "nosniff"
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      createReadStream(found.file)
        .on("error", () => {
          if (!res.headersSent) res.writeHead(500);
          res.end();
        })
        .pipe(res);
    })
    .catch(() => {
      if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Internal Server Error");
    });
}

function listen(port, attempts = 0) {
  const server = createServer(handler);
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && attempts < 10) {
      listen(port + 1, attempts + 1);
    } else {
      console.error(err);
      process.exitCode = 1;
    }
  });
  server.listen(port, () => {
    console.log("");
    console.log("  Atlas & Observatoire des Villes Intelligentes");
    console.log(`  Serving ${ROOT}`);
    console.log(`  → http://localhost:${port}`);
    console.log("  (static preview — cloud API needs `npm run dev:vercel`)");
    console.log("");
  });
}

listen(BASE_PORT);
