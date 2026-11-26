// ====== PENGATURAN APLIKASI — silakan sesuaikan ======
window.APP_CONFIG = {
  namaPondok: "Pondok Pesantren Mamba'ul Ulum",
  // Titik awal peta (tengah Indonesia). Ganti ke koordinat pondok jika ingin.
  pusatPeta: [-2.5, 117.5],
  zoomAwal: 5,
  // Lokasi pondok (opsional) — tampil sebagai penanda khusus. null jika tidak dipakai.
  lokasiPondok: null, // contoh: { lat: -7.0, lng: 112.0, label: "Pondok Pesantren Mamba'ul Ulum" }

  // Daftar unit pendidikan (warna = warna pin di peta; jenis: formal / nonformal)
  unit: [
    { nama: "MI",                 warna: "#F9AB00" },
    { nama: "MTs",                warna: "#1A73E8" },
    { nama: "SMP",                warna: "#12B5CB" },
    { nama: "MA",                 warna: "#0B8043" },
    { nama: "SMA",                warna: "#7CB342" },
    { nama: "SMK",                warna: "#E8710A" },
    { nama: "Madrasah Diniyah",   warna: "#9334E6", jenis: "nonformal" },
    { nama: "Madrasah Salafiyah", warna: "#5F6368", jenis: "nonformal" }
  ],

  // Daftar asrama bawaan (dipakai sebagai pilihan; aslinya diatur dari admin)
  asrama: [
    "Asrama Al-Ghazali", "Asrama An-Nawawi", "Asrama Asy-Syafi'i",
    "Asrama Al-Hasan", "Asrama Al-Husain", "Asrama Fatimah Az-Zahra",
    "Asrama Khadijah", "Asrama Aisyah"
  ],

  provinsi: [
    "Aceh","Sumatera Utara","Sumatera Barat","Riau","Kepulauan Riau","Jambi","Sumatera Selatan",
    "Kepulauan Bangka Belitung","Bengkulu","Lampung","DKI Jakarta","Banten","Jawa Barat","Jawa Tengah",
    "Daerah Istimewa Yogyakarta","Jawa Timur","Bali","Nusa Tenggara Barat","Nusa Tenggara Timur",
    "Kalimantan Barat","Kalimantan Tengah","Kalimantan Selatan","Kalimantan Timur","Kalimantan Utara",
    "Sulawesi Utara","Gorontalo","Sulawesi Tengah","Sulawesi Barat","Sulawesi Selatan","Sulawesi Tenggara",
    "Maluku","Maluku Utara","Papua","Papua Barat","Papua Barat Daya","Papua Tengah","Papua Pegunungan",
    "Papua Selatan"
  ]
};
