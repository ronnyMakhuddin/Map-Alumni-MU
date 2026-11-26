# Peta Alumni Pondok Pesantren Mamba'ul Ulum

Aplikasi web peta sebaran alumni dengan tampilan ala Google Maps dan halaman pembuka bertema pesantren.

- **Peta gratis tanpa API key**: Leaflet + OpenFreeMap (peta vektor, warna disesuaikan mirip Google Maps), mode Satelit (Esri) & Medan (OpenTopoMap). Bila WebGL tidak tersedia otomatis memakai tile OpenStreetMap.
- **Filter**: tahun lulus (rentang), wilayah (provinsi, atau negara untuk alumni luar negeri), unit pendidikan (formal dan non formal), asrama. Bisa digabung dengan pencarian nama/kota/pekerjaan.
- **Input lokasi**: alumni mengisi latitude/longitude manual, **Deteksi GPS**, atau **Pilih di peta** (geser pin). Negara, kota & provinsi terisi otomatis (OpenStreetMap Nominatim).
- **Privasi**: opsi "Samarkan lokasi (±1 km)" membulatkan koordinat di server sebelum disimpan. Nomor WA opsional.
- **Ubah/hapus data sendiri** dari perangkat yang sama (token edit disimpan di browser).
- Tampilan mobile (bottom sheet + bottom nav) dan desktop (panel kiri + rail), statistik per wilayah/unit/asrama/dekade.
- **Halaman admin** (`/admin.html`, berpassword): kelola data alumni (tambah, ubah, hapus, setujui/sembunyikan, aksi massal, impor & ekspor CSV), unit pendidikan (nama, warna pin, urutan), asrama, persetujuan data baru, dan lokasi pondok.

## Struktur

```
public/            Frontend statis (index.html, styles.css, app.js, intro.js, config.js, vendor/)
public/admin.html  Halaman admin (admin.js, admin.css)
api/alumni.js      API publik data alumni (GET/POST/PUT/DELETE)
api/config.js      API publik daftar unit, asrama, pengaturan
api/admin.js       API admin (wajib header x-admin-key = ADMIN_KEY)
api/_lib/db.js     Koneksi Neon, skema, validasi
scripts/schema.sql Skema tabel (dibuat otomatis oleh API saat pertama dipanggil)
scripts/dev-server.js Server lokal
```

Data disimpan di schema **`peta_alumni`** (tabel `peta_alumni.alumni`), terpisah dari tabel lain di database yang sama.

## Deploy ke Vercel

1. Buka https://vercel.com/new → **Import** repo `Map-Alumni-MU` → Framework Preset: **Other** → Deploy.
2. Di project Vercel: **Storage** → **Connect Database** → pilih database Neon yang sudah ada → Connect.
   Vercel otomatis menambahkan env `DATABASE_URL`. (Atau isi manual di Settings → Environment Variables.)
3. **Redeploy** (Deployments → ⋯ → Redeploy) agar env terbaca.
4. Tambahkan env **`ADMIN_KEY`** = kata sandi halaman admin (buat yang panjang & acak), lalu Redeploy.
   Masuk admin di `https://<domain-anda>/admin.html`.

## Pengaturan

Unit pendidikan, asrama, lokasi pondok, dan persetujuan data baru diatur dari **halaman admin** (tersimpan di tabel `peta_alumni.pengaturan`).
`public/config.js` hanya berisi nilai bawaan, titik awal peta (`pusatPeta`, `zoomAwal`), dan daftar provinsi.

## Impor CSV

Baris pertama = judul kolom (pemisah koma atau titik koma, cocok dengan "Save as CSV" dari Excel):
```
nama,tahun_masuk,tahun_lulus,unit,unit_nonformal,asrama,negara,provinsi,kota,pekerjaan,instansi,whatsapp,lat,lng,lokasi_samar
```
Wajib: `nama, tahun_lulus, lat, lng`, plus minimal salah satu dari `unit` (formal) atau `unit_nonformal`. Template bisa diunduh dari jendela impor.


## Mode contoh & lokal

- Tambahkan `?demo=1` di URL untuk melihat aplikasi dengan 180 data contoh (tidak menyentuh database).
- Lokal: `npm install` lalu `npm run dev`. Tanpa `DATABASE_URL`, server memakai PGlite (Postgres di memori) dan sandi admin `admin`.

Atribusi peta: © OpenStreetMap contributors, OpenFreeMap, OpenMapTiles, Esri, OpenTopoMap.
