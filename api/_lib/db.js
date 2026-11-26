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

export const PUBLIC_COLS = `id, created_at, nama, tahun_masuk, tahun_lulus, unit, unit_nonformal, asrama, negara, provinsi, kota,
  pekerjaan, instansi, whatsapp, lat, lng, lokasi_samar`;
export const ADMIN_COLS = `${PUBLIC_COLS}, updated_at, approved`;

// Nilai bawaan bila admin belum mengatur apa pun
export const DEFAULT_SETTINGS = {
  unit: [
    { nama: 'MI', warna: '#F9AB00' }, { nama: 'MTs', warna: '#1A73E8' }, { nama: 'SMP', warna: '#12B5CB' },
    { nama: 'MA', warna: '#0B8043' }, { nama: 'SMA', warna: '#7CB342' }, { nama: 'SMK', warna: '#E8710A' },
    { nama: 'Madrasah Diniyah', warna: '#9334E6', jenis: 'nonformal' }, { nama: 'Madrasah Salafiyah', warna: '#5F6368', jenis: 'nonformal' }
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
  await sql`alter table peta_alumni.alumni add column if not exists unit_nonformal text check (char_length(unit_nonformal) <= 60)`;
  await sql`alter table peta_alumni.alumni alter column unit drop not null`;
  await sql`alter table peta_alumni.alumni add column if not exists negara text not null default 'Indonesia' check (char_length(negara) <= 60)`;
  schemaReady = true;
}

export async function getSettings() {
  const rows = await sql`select kunci, nilai from peta_alumni.pengaturan`;
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.kunci in DEFAULT_SETTINGS) s[r.kunci] = r.nilai;
  s.unit = (s.unit || []).map((u) => ({ ...u, jenis: jenisUnit(u) }));
  return s;
}

export const PROVINSI = ['Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau', 'Jambi', 'Sumatera Selatan',
  'Kepulauan Bangka Belitung', 'Bengkulu', 'Lampung', 'DKI Jakarta', 'Banten', 'Jawa Barat', 'Jawa Tengah',
  'Daerah Istimewa Yogyakarta', 'Jawa Timur', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
  'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
  'Sulawesi Utara', 'Gorontalo', 'Sulawesi Tengah', 'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tenggara',
  'Maluku', 'Maluku Utara', 'Papua', 'Papua Barat', 'Papua Barat Daya', 'Papua Tengah', 'Papua Pegunungan', 'Papua Selatan'];
const PROV_ALIAS = { 'diy': 'Daerah Istimewa Yogyakarta', 'yogyakarta': 'Daerah Istimewa Yogyakarta', 'di yogyakarta': 'Daerah Istimewa Yogyakarta',
  'jogja': 'Daerah Istimewa Yogyakarta', 'jakarta': 'DKI Jakarta', 'dki': 'DKI Jakarta', 'jatim': 'Jawa Timur', 'jateng': 'Jawa Tengah',
  'jabar': 'Jawa Barat', 'ntb': 'Nusa Tenggara Barat', 'ntt': 'Nusa Tenggara Timur', 'babel': 'Kepulauan Bangka Belitung',
  'bangka belitung': 'Kepulauan Bangka Belitung', 'kepri': 'Kepulauan Riau', 'sumut': 'Sumatera Utara', 'sumbar': 'Sumatera Barat',
  'sumsel': 'Sumatera Selatan', 'kalbar': 'Kalimantan Barat', 'kalteng': 'Kalimantan Tengah', 'kalsel': 'Kalimantan Selatan',
  'kaltim': 'Kalimantan Timur', 'kaltara': 'Kalimantan Utara', 'sulut': 'Sulawesi Utara', 'sulteng': 'Sulawesi Tengah',
  'sulbar': 'Sulawesi Barat', 'sulsel': 'Sulawesi Selatan', 'sultra': 'Sulawesi Tenggara', 'malut': 'Maluku Utara',
  'nanggroe aceh darussalam': 'Aceh' };
// Huruf kapital semua → Huruf Awal Kapital
export function tidy(s) {
  if (!s) return s;
  s = s.replace(/\s+/g, ' ').trim();
  if (s === s.toUpperCase() || s === s.toLowerCase()) s = s.toLowerCase().replace(/(^|[\s\-(/])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  return s;
}
export function canonProv(p) {
  if (!p) return null;
  const n = p.toLowerCase().replace(/[.,]/g, ' ').replace(/^\s*(prov|provinsi|propinsi|daerah khusus ibukota|daerah khusus)\s+/, '').replace(/\s+/g, ' ').trim();
  return PROVINSI.find((x) => x.toLowerCase() === n) || PROV_ALIAS[n] || PROVINSI.find((x) => x.toLowerCase().replace(/^dki |^daerah istimewa /, '') === n) || tidy(p);
}
export function canonNegara(n) {
  if (!n) return 'Indonesia';
  const t = n.replace(/\s+/g, ' ').trim();
  if (/^(indonesia|ri|republik indonesia|nkri)$/i.test(t)) return 'Indonesia';
  return tidy(t).slice(0, 60);
}

// Asrama: cocokkan ke daftar resmi (abaikan huruf besar, tanda baca, awalan "Asrama")
const asramaKey = (v) => String(v).toLowerCase().replace(/^\s*asrama\s+/, '').replace(/[^a-z0-9]/g, '');
export function canonAsrama(v, list = []) {
  if (!v || /^[-–—.\s]*$/.test(v) || /^(tidak ada|tidak|none|non asrama)$/i.test(v.trim())) return { value: null, known: true };
  const k = asramaKey(v);
  const hit = list.find((x) => asramaKey(x) === k);
  return hit ? { value: hit, known: true } : { value: tidy(v), known: false };
}

// Unit formal (MI, MTs, MA, SMK, …) atau non formal (Diniyah, Salafiyah, …)
const NONFORMAL_RE = /diniyah|salafiyah|madin|tpq|tpa|tahfi[dz]h?|ma'?had|pengajian/i;
export function jenisUnit(u) {
  if (u && (u.jenis === 'formal' || u.jenis === 'nonformal')) return u.jenis;
  return NONFORMAL_RE.test((u && u.nama) || '') ? 'nonformal' : 'formal';
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

export function validateAlumni(body, opts = {}) {
  const b = body || {};
  if (b.website) return { error: 'Spam terdeteksi.' }; // honeypot
  const year = new Date().getFullYear() + 1;
  const d = {
    nama: str(b.nama, 120),
    tahun_masuk: int(b.tahun_masuk),
    tahun_lulus: int(b.tahun_lulus),
    unit: str(b.unit, 60),
    unit_nonformal: str(b.unit_nonformal, 60),
    asrama: str(b.asrama, 80),
    negara: str(b.negara, 60),
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
  // Unit yang ternyata non formal (mis. data lama/CSV) dipindah ke kolom non formal
  if (opts.unit && d.unit) {
    const u = opts.unit.find((x) => x.nama.toLowerCase() === d.unit.toLowerCase());
    if (u) d.unit = u.nama;
    if (u && u.jenis === 'nonformal') { if (!d.unit_nonformal) d.unit_nonformal = u.nama; d.unit = null; }
  }
  if (opts.unit && d.unit_nonformal) {
    const u = opts.unit.find((x) => x.nama.toLowerCase() === d.unit_nonformal.toLowerCase());
    if (u) d.unit_nonformal = u.nama;
  }
  if (!d.unit && !d.unit_nonformal) return { error: 'Pilih minimal satu unit pendidikan (formal atau non formal).' };
  if (opts.asrama) {
    const a = canonAsrama(d.asrama, opts.asrama);
    if (!a.known && opts.strictAsrama) return { error: 'Pilih asrama dari daftar yang tersedia.' };
    d.asrama = a.value;
  }
  // Wilayah: Indonesia memakai nama provinsi baku; luar negeri memakai nama negara
  // data lama: provinsi "Luar Negeri" + kota "Kota, Negara"
  if (!d.negara && d.provinsi && /^luar negeri$/i.test(d.provinsi) && d.kota && d.kota.includes(',')) {
    const parts = d.kota.split(','); d.negara = parts.pop(); d.kota = parts.join(',').trim(); d.provinsi = null;
  }
  d.negara = canonNegara(d.negara);
  if (d.negara === 'Indonesia') {
    if (d.provinsi && /^luar negeri$/i.test(d.provinsi)) d.provinsi = null;
    else d.provinsi = canonProv(d.provinsi);
  } else d.provinsi = tidy(d.provinsi);
  d.kota = tidy(d.kota);
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
