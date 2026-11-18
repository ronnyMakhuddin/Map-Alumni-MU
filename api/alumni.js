// Vercel Serverless Function: /api/alumni
// GET    /api/alumni              -> daftar alumni yang tampil (publik)
// POST   /api/alumni              -> tambah data alumni, mengembalikan { id, edit_token }
// PUT    /api/alumni?id=123       -> ubah data sendiri (header x-edit-token)
// DELETE /api/alumni?id=123       -> hapus data sendiri (x-edit-token) atau admin (x-admin-key)
import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = DB_URL ? neon(DB_URL) : null;

const PUBLIC_COLS = `id, created_at, nama, tahun_masuk, tahun_lulus, unit, asrama, provinsi, kota,
  pekerjaan, instansi, whatsapp, lat, lng, lokasi_samar`;

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  await sql`create schema if not exists peta_alumni`;
  await sql`create table if not exists peta_alumni.alumni (
    id bigserial primary key,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    nama text not null check (char_length(nama) between 2 and 120),
    tahun_masuk int check (tahun_masuk between 1900 and 2100),
    tahun_lulus int not null check (tahun_lulus between 1900 and 2100),
    unit text not null check (char_length(unit) <= 60),
    asrama text check (char_length(asrama) <= 80),
    provinsi text check (char_length(provinsi) <= 80),
    kota text check (char_length(kota) <= 120),
    pekerjaan text check (char_length(pekerjaan) <= 120),
    instansi text check (char_length(instansi) <= 160),
    whatsapp text check (char_length(whatsapp) <= 20),
    lat double precision not null check (lat between -90 and 90),
    lng double precision not null check (lng between -180 and 180),
    lokasi_samar boolean not null default true,
    approved boolean not null default true,
    edit_token uuid not null default gen_random_uuid()
  )`;
  schemaReady = true;
}

function str(v, max) {
  if (v === undefined || v === null) return null;
  const s = String(v).replace(/[\u0000-\u001f]/g, ' ').trim();
  return s ? s.slice(0, max) : null;
}
function int(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function validate(body) {
  const b = body || {};
  if (b.website) return { error: 'Spam terdeteksi.' }; // honeypot
  const year = new Date().getFullYear() + 1;
  const d = {
    nama: str(b.nama, 120),
    tahun_masuk: int(b.tahun_masuk),
    tahun_lulus: int(b.tahun_lulus),
    unit: str(b.unit, 60),
    asrama: str(b.asrama, 80),
    provinsi: str(b.provinsi, 80),
    kota: str(b.kota, 120),
    pekerjaan: str(b.pekerjaan, 120),
    instansi: str(b.instansi, 160),
    whatsapp: str(b.whatsapp, 20),
    lat: Number(b.lat),
    lng: Number(b.lng),
    lokasi_samar: b.lokasi_samar !== false,
  };
  if (!d.nama || d.nama.length < 2) return { error: 'Nama wajib diisi.' };
  if (!d.tahun_lulus || d.tahun_lulus < 1900 || d.tahun_lulus > year) return { error: 'Tahun lulus tidak valid.' };
  if (d.tahun_masuk && (d.tahun_masuk < 1900 || d.tahun_masuk > d.tahun_lulus)) return { error: 'Tahun masuk tidak valid.' };
  if (!d.unit) return { error: 'Unit pendidikan wajib dipilih.' };
  if (!Number.isFinite(d.lat) || d.lat < -90 || d.lat > 90) return { error: 'Latitude harus antara -90 dan 90.' };
  if (!Number.isFinite(d.lng) || d.lng < -180 || d.lng > 180) return { error: 'Longitude harus antara -180 dan 180.' };
  if (d.whatsapp) {
    d.whatsapp = d.whatsapp.replace(/[^\d+]/g, '');
    if (!/^\+?\d{8,16}$/.test(d.whatsapp)) return { error: 'Nomor WhatsApp tidak valid.' };
  }
  // Lokasi disamarkan di server juga: dibulatkan ke ~1 km, titik asli tidak pernah disimpan.
  if (d.lokasi_samar) {
    d.lat = Math.round(d.lat * 100) / 100;
    d.lng = Math.round(d.lng * 100) / 100;
  } else {
    d.lat = Math.round(d.lat * 1e6) / 1e6;
    d.lng = Math.round(d.lng * 1e6) / 1e6;
  }
  return { data: d };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

function send(res, status, payload, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (!sql) return send(res, 500, { error: 'DATABASE_URL belum diatur di Vercel.' });
  try {
    await ensureSchema();
    const url = new URL(req.url, 'http://x');
    const id = int(url.searchParams.get('id'));

    if (req.method === 'GET') {
      const rows = await sql.query(
        `select ${PUBLIC_COLS} from peta_alumni.alumni where approved order by tahun_lulus desc, nama asc limit 20000`
      );
      return send(res, 200, { data: rows }, { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' });
    }

    if (req.method === 'POST') {
      const { data: d, error } = validate(await readBody(req));
      if (error) return send(res, 400, { error });
      const [row] = await sql`
        insert into peta_alumni.alumni
          (nama, tahun_masuk, tahun_lulus, unit, asrama, provinsi, kota, pekerjaan, instansi, whatsapp, lat, lng, lokasi_samar)
        values
          (${d.nama}, ${d.tahun_masuk}, ${d.tahun_lulus}, ${d.unit}, ${d.asrama}, ${d.provinsi}, ${d.kota},
           ${d.pekerjaan}, ${d.instansi}, ${d.whatsapp}, ${d.lat}, ${d.lng}, ${d.lokasi_samar})
        returning id, edit_token`;
      return send(res, 201, { id: row.id, edit_token: row.edit_token });
    }

    const token = req.headers['x-edit-token'];
    const adminKey = req.headers['x-admin-key'];
    const isAdmin = !!process.env.ADMIN_KEY && adminKey === process.env.ADMIN_KEY;
    if (!id) return send(res, 400, { error: 'Parameter id wajib.' });
    if (!isAdmin && !(token && UUID_RE.test(token))) return send(res, 401, { error: 'Token tidak valid.' });

    if (req.method === 'PUT') {
      const { data: d, error } = validate(await readBody(req));
      if (error) return send(res, 400, { error });
      const rows = await sql`
        update peta_alumni.alumni set
          nama=${d.nama}, tahun_masuk=${d.tahun_masuk}, tahun_lulus=${d.tahun_lulus}, unit=${d.unit},
          asrama=${d.asrama}, provinsi=${d.provinsi}, kota=${d.kota}, pekerjaan=${d.pekerjaan},
          instansi=${d.instansi}, whatsapp=${d.whatsapp}, lat=${d.lat}, lng=${d.lng},
          lokasi_samar=${d.lokasi_samar}, updated_at=now()
        where id=${id} and (${isAdmin} or edit_token=${isAdmin ? null : token}::uuid)
        returning id`;
      if (!rows.length) return send(res, 404, { error: 'Data tidak ditemukan atau token salah.' });
      return send(res, 200, { id });
    }

    if (req.method === 'DELETE') {
      const rows = await sql`
        delete from peta_alumni.alumni
        where id=${id} and (${isAdmin} or edit_token=${isAdmin ? null : token}::uuid)
        returning id`;
      if (!rows.length) return send(res, 404, { error: 'Data tidak ditemukan atau token salah.' });
      return send(res, 200, { deleted: id });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return send(res, 405, { error: 'Method tidak didukung.' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'Terjadi kesalahan server.' });
  }
}
