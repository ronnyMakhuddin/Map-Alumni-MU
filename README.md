# Peta Alumni Pondok Pesantren Mamba'ul Ulum

Aplikasi web peta sebaran alumni dengan tampilan ala Google Maps dan halaman pembuka bertema pesantren.

- **Peta gratis**: Leaflet + tile CARTO Voyager (mirip Google Maps), mode Satelit (Esri) & Medan (OpenTopoMap). Tanpa API key.
- **Filter**: tahun lulus (rentang), wilayah/provinsi, unit pendidikan, asrama. Bisa digabung dengan pencarian nama/kota/pekerjaan.
- **Input lokasi**: alumni mengisi latitude/longitude manual, **Deteksi GPS**, atau **Pilih di peta** (geser pin). Kota & provinsi terisi otomatis (OpenStreetMap Nominatim).
- **Privasi**: opsi "Samarkan lokasi (±1 km)" membulatkan koordinat di server sebelum disimpan. Nomor WA opsional.
- **Ubah/hapus data sendiri** dari perangkat yang sama (token edit disimpan di browser).
- Tampilan mobile (bottom sheet + bottom nav) dan desktop (panel kiri + rail), statistik per wilayah/unit/asrama/dekade.

## Struktur

```
public/            Frontend statis (index.html, styles.css, app.js, intro.js, config.js, vendor/)
api/alumni.js      Vercel Serverless Function (GET/POST/PUT/DELETE) ke Neon Postgres
scripts/schema.sql Skema tabel (dibuat otomatis oleh API saat pertama dipanggil)
scripts/dev-server.js Server lokal
```

Data disimpan di schema **`peta_alumni`** (tabel `peta_alumni.alumni`), terpisah dari tabel lain di database yang sama.

## Deploy ke Vercel

1. Buka https://vercel.com/new → **Import** repo `Map-Alumni-MU` → Framework Preset: **Other** → Deploy.
2. Di project Vercel: **Storage** → **Connect Database** → pilih database Neon yang sudah ada → Connect.
   Vercel otomatis menambahkan env `DATABASE_URL`. (Atau isi manual di Settings → Environment Variables.)
3. **Redeploy** (Deployments → ⋯ → Redeploy) agar env terbaca.
4. Opsional: tambahkan env `ADMIN_KEY` (string acak) untuk menghapus data lewat API dengan header `x-admin-key`.

## Pengaturan

Ubah `public/config.js`:
- `unit` — daftar unit pendidikan & warna pin
- `asrama` — daftar nama asrama (alumni tetap bisa mengetik nama lain)
- `pusatPeta`, `zoomAwal`, `lokasiPondok` — titik awal & penanda lokasi pondok

## Moderasi

Sembunyikan data tanpa menghapus (Neon SQL Editor):
```sql
update peta_alumni.alumni set approved = false where id = 123;
```

## Mode contoh & lokal

- Tambahkan `?demo=1` di URL untuk melihat aplikasi dengan 180 data contoh (tidak menyentuh database).
- Lokal: `npm install` lalu `npm run dev` (tanpa `DATABASE_URL` memakai data sementara di memori).

Atribusi peta: © OpenStreetMap contributors, © CARTO, Esri, OpenTopoMap.
