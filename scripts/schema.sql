-- Skema database (dibuat otomatis oleh API saat pertama kali dipanggil; file ini untuk referensi)
create schema if not exists peta_alumni;
create table if not exists peta_alumni.alumni (
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
);
create index if not exists alumni_approved_idx on peta_alumni.alumni (approved, tahun_lulus);

-- Moderasi: sembunyikan data tanpa menghapus
-- update peta_alumni.alumni set approved = false where id = 123;
