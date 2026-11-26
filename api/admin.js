// /api/admin — semua permintaan wajib header x-admin-key = env ADMIN_KEY
//   GET    ?r=ping                 cek login
//   GET    ?r=alumni               semua data (termasuk yang belum disetujui)
//   POST   ?r=alumni               tambah satu data, atau array (impor CSV, maks 2000)
//   PUT    ?r=alumni&id=1          ubah data (termasuk status approved)
//   DELETE ?r=alumni&id=1          hapus data
//   PATCH  ?r=alumni               aksi massal { ids:[..], aksi:'setujui'|'sembunyikan'|'hapus' }
//   PUT    ?r=pengaturan           { unit, asrama, perlu_persetujuan, lokasi_pondok, ganti_unit, ganti_asrama }
import { sql, ADMIN_COLS, ensureSchema, getSettings, validateAlumni, readBody, send, int, str, isAdmin } from './_lib/db.js';

const HEX = /^#[0-9a-f]{6}$/i;

export default async function handler(req, res) {
  if (!sql) return send(res, 500, { error: 'Database belum terhubung: hubungkan Neon di Vercel (Storage → Connect Database) lalu Redeploy.' });
  if (!process.env.ADMIN_KEY) return send(res, 503, { error: 'ADMIN_KEY belum diatur di Environment Variables Vercel.' });
  if (!isAdmin(req)) return send(res, 401, { error: 'Kata sandi admin salah.' });
  res.setHeader('Cache-Control', 'no-store');
  try {
    await ensureSchema();
    const url = new URL(req.url, 'http://x');
    const r = url.searchParams.get('r');
    const id = int(url.searchParams.get('id'));

    if (r === 'ping') return send(res, 200, { ok: true });

    if (r === 'alumni') {
      if (req.method === 'GET') {
        const rows = await sql.query(`select ${ADMIN_COLS} from peta_alumni.alumni order by created_at desc limit 50000`);
        return send(res, 200, { data: rows });
      }
      if (req.method === 'POST') {
        const body = await readBody(req);
        const list = Array.isArray(body) ? body : [body];
        if (list.length > 2000) return send(res, 400, { error: 'Maksimal 2000 baris per impor.' });
        const { asrama, unit } = await getSettings();
        const ok = [], gagal = [];
        list.forEach((b, i) => {
          const v = validateAlumni({ ...b, website: undefined }, { asrama, unit });
          if (v.error) gagal.push({ baris: i + 1, error: v.error }); else ok.push({ ...v.data, approved: b.approved !== false && b.approved !== 'false' });
        });
        if (!Array.isArray(body) && gagal.length) return send(res, 400, { error: gagal[0].error });
        const ids = [];
        for (let i = 0; i < ok.length; i += 200) {
          const chunk = ok.slice(i, i + 200);
          const out = await sql.transaction(chunk.map((d) => sql`
            insert into peta_alumni.alumni
              (nama, tahun_masuk, tahun_lulus, unit, unit_nonformal, asrama, negara, provinsi, kota, pekerjaan, instansi, whatsapp, lat, lng, lokasi_samar, approved)
            values (${d.nama}, ${d.tahun_masuk}, ${d.tahun_lulus}, ${d.unit}, ${d.unit_nonformal}, ${d.asrama}, ${d.negara}, ${d.provinsi}, ${d.kota},
              ${d.pekerjaan}, ${d.instansi}, ${d.whatsapp}, ${d.lat}, ${d.lng}, ${d.lokasi_samar}, ${d.approved})
            returning id`));
          out.forEach((rows) => ids.push(rows[0].id));
        }
        return send(res, 201, { ditambah: ids.length, ids, gagal });
      }
      if (req.method === 'PUT') {
        if (!id) return send(res, 400, { error: 'Parameter id wajib.' });
        const body = await readBody(req);
        const { asrama, unit } = await getSettings();
        const { data: d, error } = validateAlumni({ ...body, website: undefined }, { asrama, unit });
        if (error) return send(res, 400, { error });
        const approved = body.approved !== false && body.approved !== 'false';
        const rows = await sql`
          update peta_alumni.alumni set
            nama=${d.nama}, tahun_masuk=${d.tahun_masuk}, tahun_lulus=${d.tahun_lulus}, unit=${d.unit}, unit_nonformal=${d.unit_nonformal},
            asrama=${d.asrama}, negara=${d.negara}, provinsi=${d.provinsi}, kota=${d.kota}, pekerjaan=${d.pekerjaan},
            instansi=${d.instansi}, whatsapp=${d.whatsapp}, lat=${d.lat}, lng=${d.lng},
            lokasi_samar=${d.lokasi_samar}, approved=${approved}, updated_at=now()
          where id=${id} returning id`;
        if (!rows.length) return send(res, 404, { error: 'Data tidak ditemukan.' });
        return send(res, 200, { id });
      }
      if (req.method === 'DELETE') {
        if (!id) return send(res, 400, { error: 'Parameter id wajib.' });
        await sql`delete from peta_alumni.alumni where id=${id}`;
        return send(res, 200, { deleted: id });
      }
      if (req.method === 'PATCH') {
        const b = await readBody(req);
        const ids = (Array.isArray(b.ids) ? b.ids : []).map(int).filter(Boolean).slice(0, 50000);
        if (!ids.length) return send(res, 400, { error: 'Tidak ada data dipilih.' });
        let rows;
        if (b.aksi === 'setujui') rows = await sql`update peta_alumni.alumni set approved=true, updated_at=now() where id = any(${ids}::bigint[]) returning id`;
        else if (b.aksi === 'sembunyikan') rows = await sql`update peta_alumni.alumni set approved=false, updated_at=now() where id = any(${ids}::bigint[]) returning id`;
        else if (b.aksi === 'hapus') rows = await sql`delete from peta_alumni.alumni where id = any(${ids}::bigint[]) returning id`;
        else return send(res, 400, { error: 'Aksi tidak dikenal.' });
        return send(res, 200, { diproses: rows.length });
      }
    }

    if (r === 'pengaturan' && req.method === 'PUT') {
      const b = await readBody(req);
      const cur = await getSettings();
      const next = { ...cur };
      if (Array.isArray(b.unit)) {
        const seen = new Set();
        next.unit = b.unit.map((u) => ({ nama: str(u && u.nama, 60), warna: HEX.test(u && u.warna) ? u.warna : '#5F6368', jenis: u && u.jenis === 'nonformal' ? 'nonformal' : 'formal' }))
          .filter((u) => u.nama && !seen.has(u.nama.toLowerCase()) && seen.add(u.nama.toLowerCase()));
        if (!next.unit.length) return send(res, 400, { error: 'Minimal harus ada satu unit.' });
      }
      if (Array.isArray(b.asrama)) {
        const seen = new Set();
        next.asrama = b.asrama.map((a) => str(a, 80)).filter((a) => a && !seen.has(a.toLowerCase()) && seen.add(a.toLowerCase()));
      }
      if (typeof b.perlu_persetujuan === 'boolean') next.perlu_persetujuan = b.perlu_persetujuan;
      if ('lokasi_pondok' in b) {
        const p = b.lokasi_pondok;
        if (p && Number.isFinite(+p.lat) && Number.isFinite(+p.lng) && Math.abs(+p.lat) <= 90 && Math.abs(+p.lng) <= 180)
          next.lokasi_pondok = { lat: +p.lat, lng: +p.lng, label: str(p.label, 120) || "Pondok Pesantren Mamba'ul Ulum" };
        else next.lokasi_pondok = null;
      }
      const q = [];
      for (const k of ['unit', 'asrama', 'perlu_persetujuan', 'lokasi_pondok']) {
        q.push(sql`insert into peta_alumni.pengaturan (kunci, nilai, updated_at) values (${k}, ${JSON.stringify(next[k])}::jsonb, now())
                   on conflict (kunci) do update set nilai = excluded.nilai, updated_at = now()`);
      }
      // Ganti nama unit/asrama: ikut perbarui data alumni yang memakai nama lama
      let diganti = 0;
      for (const [col, map] of [['unit', b.ganti_unit], ['asrama', b.ganti_asrama]]) {
        if (!map || typeof map !== 'object') continue;
        for (const [lama, baru] of Object.entries(map)) {
          const l = str(lama, 80), n = str(baru, 80);
          if (!l || !n || l === n) continue;
          q.push(col === 'unit'
            ? sql`update peta_alumni.alumni set unit = case when unit=${l} then ${n} else unit end,
                    unit_nonformal = case when unit_nonformal=${l} then ${n} else unit_nonformal end, updated_at=now()
                  where unit=${l} or unit_nonformal=${l}`
            : sql`update peta_alumni.alumni set asrama=${n}, updated_at=now() where asrama=${l}`);
          diganti++;
        }
      }
      // Pindahkan data agar kolom sesuai jenis unit (formal / non formal)
      const nf = next.unit.filter((u) => u.jenis === 'nonformal').map((u) => u.nama);
      const fm = next.unit.filter((u) => u.jenis === 'formal').map((u) => u.nama);
      q.push(sql`update peta_alumni.alumni set unit_nonformal = coalesce(unit_nonformal, unit), unit = null, updated_at=now()
                 where unit = any(${nf}::text[]) and (unit_nonformal is null or unit_nonformal = unit)`);
      q.push(sql`update peta_alumni.alumni set unit = unit_nonformal, unit_nonformal = null, updated_at=now()
                 where unit is null and unit_nonformal = any(${fm}::text[])`);
      await sql.transaction(q);
      return send(res, 200, { data: next, diganti });
    }

    return send(res, 404, { error: 'Endpoint tidak dikenal.' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'Terjadi kesalahan server.' });
  }
}
