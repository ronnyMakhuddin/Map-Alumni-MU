// GET /api/config -> daftar unit, asrama, dan pengaturan publik (diatur dari halaman admin)
import { sql, ensureSchema, getSettings, send } from './_lib/db.js';

export default async function handler(req, res) {
  if (!sql) return send(res, 500, { error: 'Database belum terhubung: hubungkan Neon di Vercel (Storage → Connect Database) lalu Redeploy.' });
  try {
    await ensureSchema();
    const s = await getSettings();
    return send(res, 200, { data: s }, { 'Cache-Control': 'no-store' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'Terjadi kesalahan server.' });
  }
}
