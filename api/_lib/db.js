// Kode bersama untuk semua endpoint (folder berawalan _ tidak menjadi route di Vercel)
import { neon } from '@neondatabase/serverless';
import { timingSafeEqual } from 'node:crypto';

// Integrasi Neon di Vercel bisa memberi nama variabel berbeda (mis. STORAGE_DATABASE_URL, POSTGRES_URL)
function findDbUrl() {
  const env = process.env;
  const pref = ['DATABASE_URL', 'POSTGRES_URL', 'NEON_DATABASE_URL'];
  for (const k of pref) if (env[k]) return env[k];
  const keys = Object.keys(env).filter((k) => /(DATABASE_URL|POSTGRES_URL)$/.test(k) && !/UNPOOLED|NON_POOLING/.test(k));
  return keys.length ? env[keys[0]] : null;
}
const DB_URL = findDbUrl();
// globalThis.__SQL__ hanya dipakai server lokal (scripts/dev-server.js) untuk database tiruan
export const sql = globalThis.__SQL__ || (DB_URL ? neon(DB_URL) : null);

export const PUBLIC_COLS = `id, created_at, nama, tahun_masuk, tahun_lulus, unit, asrama, provinsi, kota,
  pekerjaan, instansi, whatsapp, lat, lng, lokasi_samar`;
export const ADMIN_COLS = `${PUBLIC_COLS}, updated_at, approved`;

// Nilai bawaan bila admin belum mengatur apa pun
export const DEFAULT_SETTINGS = {
  unit: [
    { nama: 'MI', warna: '#F9AB00' }, { nama: 'MTs', warna: '#1A73E8' }, { nama: 'SMP', warna: '#12B5CB' },
    { nama: 'MA', warna: '#0B8043' }, { nama: 'SMA', warna: '#7CB342' }, { nama: 'SMK', warna: '#E8710A' },
    { nama: 'Madrasah Diniyah', warna: '#9334E6' }, { nama: "Tahfidz Al-Qur'an", warna: '#D93025' }, { nama: "Ma'had Aly", warna: '#5F6368' }
  ],
  asrama: ['Asrama Al-Ghazali', 'Asrama An-Nawawi', "Asrama Asy-Syafi'i", 'Asrama Al-Hasan', 'Asrama Al-Husain',
    'Asrama Fatimah Az-Zahra', 'Asrama Khadijah', 'Asrama Aisyah'],
  perlu_persetujuan: false,
  lokasi_pondok: null
};

let schemaReady = false;
export async function ensureSchema() {
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
  await sql`create table if not exists peta_alumni.pengaturan (
    kunci text primary key, nilai jsonb not null, updated_at timestamptz not null default now()
  )`;
  schemaReady = true;
}

export async function getSettings() {
  const rows = await sql`select kunci, nilai from peta_alumni.pengaturan`;
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.kunci in DEFAULT_SETTINGS) s[r.kunci] = r.nilai;
  return s;
}

export function str(v, max) {
  if (v === undefined || v === null) return null;
  const s = String(v).replace(/[\u0000-\u001f]/g, ' ').trim();
  return s ? s.slice(0, max) : null;
}
export function int(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export function validateAlumni(body) {
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
    lat: Number(String(b.lat ?? '').replace(',', '.')),
    lng: Number(String(b.lng ?? '').replace(',', '.')),
    lokasi_samar: b.lokasi_samar === true || b.lokasi_samar === 'true' || b.lokasi_samar === 1
  };
  if (!d.nama || d.nama.length < 2) return { error: 'Nama wajib diisi.' };
  if (!d.tahun_lulus || d.tahun_lulus < 1900 || d.tahun_lulus > year) return { error: 'Tahun lulus tidak valid.' };
  if (d.tahun_masuk && (d.tahun_masuk < 1900 || d.tahun_masuk > d.tahun_lulus)) return { error: 'Tahun masuk tidak valid.' };
  if (!d.unit) return { error: 'Unit pendidikan wajib dipilih.' };
  if (!Number.isFinite(d.lat) || d.lat < -90 || d.lat > 90 || String(b.lat ?? '') === '') return { error: 'Latitude harus antara -90 dan 90.' };
  if (!Number.isFinite(d.lng) || d.lng < -180 || d.lng > 180 || String(b.lng ?? '') === '') return { error: 'Longitude harus antara -180 dan 180.' };
  if (d.whatsapp) {
    d.whatsapp = d.whatsapp.replace(/[^\d+]/g, '');
    if (!/^\+?\d{8,16}$/.test(d.whatsapp)) return { error: 'Nomor WhatsApp tidak valid.' };
  }
  // Lokasi disamarkan di server: dibulatkan ke ~1 km, titik asli tidak pernah disimpan.
  const f = d.lokasi_samar ? 100 : 1e6;
  d.lat = Math.round(d.lat * f) / f;
  d.lng = Math.round(d.lng * f) / f;
  return { data: d };
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

export function send(res, status, payload, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(payload));
}

export function isAdmin(req) {
  const key = process.env.ADMIN_KEY;
  const got = req.headers['x-admin-key'];
  if (!key || !got || typeof got !== 'string') return false;
  const a = Buffer.from(key), b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
