// Server lokal: `npm run dev` lalu buka http://localhost:3000 (admin: /admin.html)
// - Dengan DATABASE_URL  : terhubung ke Neon sungguhan.
// - Tanpa DATABASE_URL   : memakai PGlite (Postgres di memori) — data hilang saat server berhenti.
//   Kata sandi admin lokal = env ADMIN_KEY, atau "admin" bila tidak diisi.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

if (!process.env.DATABASE_URL) {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite({ parsers: { 20: (v) => v } }); // bigint dikembalikan sebagai string, sama seperti Neon
  const run = async (text, params) => (await db.query(text, params)).rows;
  const sql = (strings, ...vals) => {
    let text = strings[0];
    vals.forEach((_, i) => { text += '$' + (i + 1) + strings[i + 1]; });
    return { text, params: vals, then: (a, b) => run(text, vals).then(a, b) };
  };
  sql.query = (text, params = []) => run(text, params);
  sql.transaction = async (qs) => {
    const out = [];
    await db.transaction(async (tx) => { for (const q of qs) out.push((await tx.query(q.text, q.params)).rows); });
    return out;
  };
  globalThis.__SQL__ = sql;
  process.env.ADMIN_KEY = process.env.ADMIN_KEY || 'admin';
  console.log('DATABASE_URL kosong: memakai PGlite di memori. Sandi admin:', process.env.ADMIN_KEY);
}

const routes = {
  '/api/alumni': (await import('../api/alumni.js')).default,
  '/api/config': (await import('../api/config.js')).default,
  '/api/admin': (await import('../api/admin.js')).default
};
const root = new URL('../public/', import.meta.url).pathname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };

http.createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  if (routes[path]) return routes[path](req, res);
  let p = normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, '');
  if (p === '/') p = '/index.html';
  try {
    const data = await readFile(join(root, p));
    res.writeHead(200, { 'Content-Type': (types[extname(p)] || 'application/octet-stream') + (types[extname(p)]?.startsWith('text') ? '; charset=utf-8' : '') });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(process.env.PORT || 3000, () => console.log('http://localhost:' + (process.env.PORT || 3000)));
