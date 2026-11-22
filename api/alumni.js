// Vercel Serverless Function: /api/alumni (publik)
// GET    /api/alumni          -> daftar alumni yang tampil
// POST   /api/alumni          -> tambah data, mengembalikan { id, edit_token, pending }
// PUT    /api/alumni?id=123   -> ubah data sendiri (header x-edit-token)
// DELETE /api/alumni?id=123   -> hapus data sendiri (header x-edit-token)
import { sql, PUBLIC_COLS, ensureSchema, getSettings, validateAlumni, readBody, send, int, UUID_RE } from './_lib/db.js';

export default async function handler(req, res) {
  if (!sql) return send(res, 500, { error: 'Database belum terhubung: hubungkan Neon di Vercel (Storage → Connect Database) lalu Redeploy.' });
  try {
    await ensureSchema();
    const url = new URL(req.url, 'http://x');
    const id = int(url.searchParams.get('id'));

    if (req.method === 'GET') {
      const rows = await sql.query(
        `select ${PUBLIC_COLS} from peta_alumni.alumni where approved order by tahun_lulus desc, nama asc limit 20000`
      );
      return send(res, 200, { data: rows }, { 'Cache-Control': 'no-store' });
    }

    if (req.method === 'POST') {
      const { perlu_persetujuan, asrama } = await getSettings();
      const { data: d, error } = validateAlumni(await readBody(req), { asrama, strictAsrama: true });
      if (error) return send(res, 400, { error });
      const approved = !perlu_persetujuan;
      const [row] = await sql`
        insert into peta_alumni.alumni
          (nama, tahun_masuk, tahun_lulus, unit, asrama, negara, provinsi, kota, pekerjaan, instansi, whatsapp, lat, lng, lokasi_samar, approved)
        values
          (${d.nama}, ${d.tahun_masuk}, ${d.tahun_lulus}, ${d.unit}, ${d.asrama}, ${d.negara}, ${d.provinsi}, ${d.kota},
           ${d.pekerjaan}, ${d.instansi}, ${d.whatsapp}, ${d.lat}, ${d.lng}, ${d.lokasi_samar}, ${approved})
        returning id, edit_token`;
      return send(res, 201, { id: row.id, edit_token: row.edit_token, pending: !approved });
    }

    const token = req.headers['x-edit-token'];
    if (!id) return send(res, 400, { error: 'Parameter id wajib.' });
    if (!(typeof token === 'string' && UUID_RE.test(token))) return send(res, 401, { error: 'Token tidak valid.' });

    if (req.method === 'PUT') {
      const { asrama } = await getSettings();
      const { data: d, error } = validateAlumni(await readBody(req), { asrama, strictAsrama: true });
      if (error) return send(res, 400, { error });
      const rows = await sql`
        update peta_alumni.alumni set
          nama=${d.nama}, tahun_masuk=${d.tahun_masuk}, tahun_lulus=${d.tahun_lulus}, unit=${d.unit},
          asrama=${d.asrama}, negara=${d.negara}, provinsi=${d.provinsi}, kota=${d.kota}, pekerjaan=${d.pekerjaan},
          instansi=${d.instansi}, whatsapp=${d.whatsapp}, lat=${d.lat}, lng=${d.lng},
          lokasi_samar=${d.lokasi_samar}, updated_at=now()
        where id=${id} and edit_token=${token}::uuid
        returning id, approved`;
      if (!rows.length) return send(res, 404, { error: 'Data tidak ditemukan atau token salah.' });
      return send(res, 200, { id, pending: !rows[0].approved });
    }

    if (req.method === 'DELETE') {
      const rows = await sql`delete from peta_alumni.alumni where id=${id} and edit_token=${token}::uuid returning id`;
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
