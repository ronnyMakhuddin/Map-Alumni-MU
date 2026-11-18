// Server lokal sederhana: `DATABASE_URL=... npm run dev` lalu buka http://localhost:3000
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import realHandler from '../api/alumni.js';

// Tanpa DATABASE_URL: pakai penyimpanan sementara di memori (untuk mencoba tampilan saja).
const mem = []; let seq = 1;
async function mockHandler(req, res) {
  const url = new URL(req.url, 'http://x'); const id = +url.searchParams.get('id');
  let body = ''; for await (const c of req) body += c; const d = body ? JSON.parse(body) : {};
  const out = (s, j) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(j)); };
  if (d.lokasi_samar !== false && d.lat != null) { d.lat = Math.round(d.lat * 100) / 100; d.lng = Math.round(d.lng * 100) / 100; }
  if (req.method === 'GET') return out(200, { data: mem.map(({ edit_token, ...r }) => r) });
  if (req.method === 'POST') { const r = { ...d, id: seq++, edit_token: crypto.randomUUID() }; mem.push(r); return out(201, { id: r.id, edit_token: r.edit_token }); }
  const i = mem.findIndex((r) => r.id === id && r.edit_token === req.headers['x-edit-token']);
  if (i < 0) return out(404, { error: 'Data tidak ditemukan atau token salah.' });
  if (req.method === 'PUT') { mem[i] = { ...mem[i], ...d }; return out(200, { id }); }
  if (req.method === 'DELETE') { mem.splice(i, 1); return out(200, { deleted: id }); }
}
const handler = process.env.DATABASE_URL ? realHandler : mockHandler;
if (!process.env.DATABASE_URL) console.log('DATABASE_URL kosong: memakai data sementara di memori.');

const root = new URL('../public/', import.meta.url).pathname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/alumni')) return handler(req, res);
  let p = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  if (p === '/' ) p = '/index.html';
  try {
    const data = await readFile(join(root, p));
    res.writeHead(200, { 'Content-Type': (types[extname(p)] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(process.env.PORT || 3000, () => console.log('http://localhost:' + (process.env.PORT || 3000)));
