#!/usr/bin/env node
/* ============================================================
   RESCATE OPEN — Servidor estático de desarrollo (0 dependencias)
   Sirve app/ con las MISMAS cabeceras de seguridad que debe tener
   el subdominio en producción. Si algo se rompe por la CSP aquí,
   se habría roto en producción: ese es el punto.

   Uso: node herramientas/servidor.js [puerto]
   ============================================================ */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(fileURLToPath(new URL("../", import.meta.url)));
const BASE = join(RAIZ, "app");
const PUERTO = Number(process.argv[2] || process.env.PORT || 4173);

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".md": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

/* Misma política que docs/06-seguridad.md. Sin 'unsafe-inline' en scripts. */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "object-src 'none'",
].join("; ");

const CABECERAS = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "geolocation=(self), camera=(self), microphone=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

const servidor = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let ruta = decodeURIComponent(url.pathname);
    if (ruta.endsWith("/")) ruta += "index.html";

    /* Los documentos (LICENSE, legal/, docs/) se sirven desde la raíz
       del proyecto porque la aplicación enlaza a ellos con ../ */
    const desdeRaiz = ruta.startsWith("/../") || ruta.startsWith("/legal/") || ruta.startsWith("/docs/") || ruta === "/LICENSE" || ruta === "/SECURITY.md";
    const base = desdeRaiz ? RAIZ : BASE;
    const archivo = join(base, normalize(ruta).replace(/^(\.\.[/\\])+/, ""));

    if (!archivo.startsWith(RAIZ)) {
      res.writeHead(403, CABECERAS).end("Prohibido");
      return;
    }

    const info = await stat(archivo);
    const contenido = await readFile(info.isDirectory() ? join(archivo, "index.html") : archivo);
    res.writeHead(200, {
      ...CABECERAS,
      "Content-Type": TIPOS[extname(archivo)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(contenido);
  } catch {
    res.writeHead(404, { ...CABECERAS, "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>404</h1><p>No encontrado.</p>");
  }
});

servidor.listen(PUERTO, () => {
  console.log(`Rescate Open (piloto local) → http://localhost:${PUERTO}`);
  console.log("Cabeceras de seguridad activas, igual que en producción.");
});
