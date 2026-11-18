// GET /api/config -> daftar unit, asrama, dan pengaturan publik (diatur dari halaman admin)
import { sql, ensureSchema, getSettings, send } from './_lib/db.js';

export default async function handler(req, res) {
  if (!sql) return send(res, 500, { error: 'DATABASE_URL belum diatur di Vercel.' });
  try {
    await ensureSchema();
    const s = await getSettings();
    return send(res, 200, { data: s }, { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'Terjadi kesalahan server.' });
  }
}
