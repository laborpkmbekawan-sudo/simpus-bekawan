-- =========================================================
-- SIMPUS UPTD Puskesmas Bekawan
-- Skema awal: hak akses (roles) + data pegawai + auth link
-- Jalankan di Supabase SQL Editor (Project > SQL Editor > New query)
-- =========================================================

-- 1. Enum peran/hak akses.
--    Tambah nilai baru lewat ALTER TYPE jika modul baru butuh peran baru.
create type public.peran_akses as enum (
  'admin',              -- kelola pegawai, akun, konfigurasi sistem
  'kapus',              -- Kepala Puskesmas
  'bendahara_bok',      -- Bendahara BOK (Bantuan Operasional Kesehatan)
  'manajemen',          -- Klaster 1 (manajemen)
  'dokter',
  'dokter_gigi',
  'perawat',
  'bidan',
  'farmasi',
  'laboratorium',
  'tenaga_gizi',
  'kesling',             -- Kesehatan Lingkungan
  'promkes',             -- Promosi Kesehatan
  'loket_rm_kasir'      -- loket pendaftaran + rekam medis + kasir, satu peran gabungan
);

-- 2. Tabel pegawai. Satu baris = satu pegawai puskesmas.
--    id sengaja SAMA dengan auth.users.id (1:1), supaya login Supabase Auth
--    otomatis terhubung ke data pegawai + hak akses miliknya.
create table public.pegawai (
  id uuid primary key references auth.users (id) on delete cascade,
  nip text unique,                        -- Nomor Induk Pegawai / NIK, boleh kosong dulu
  nama_lengkap text not null,
  jabatan text,                           -- contoh: "Dokter Umum", "Bidan Desa"
  unit_kerja text,                        -- contoh: "Poli Umum", "Apotek"
  peran public.peran_akses not null default 'loket_rm_kasir',
  nomor_hp text,
  status_aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

comment on table public.pegawai is 'Data pegawai UPTD Puskesmas Bekawan + hak akses sistem';

-- 3. Trigger: auto-update kolom diperbarui_pada tiap kali baris diubah.
create or replace function public.set_diperbarui_pada()
returns trigger
language plpgsql
as $$
begin
  new.diperbarui_pada = now();
  return new;
end;
$$;

create trigger trg_pegawai_diperbarui
before update on public.pegawai
for each row execute function public.set_diperbarui_pada();

-- 4. Aktifkan Row Level Security. WAJIB, ini yang menjaga data aman.
alter table public.pegawai enable row level security;

-- 5. Helper: ambil peran pegawai yang sedang login, dipakai di banyak policy.
create or replace function public.peran_saya()
returns public.peran_akses
language sql
security definer
set search_path = public
stable
as $$
  select peran from public.pegawai where id = auth.uid();
$$;

-- 6. Policy: setiap pegawai boleh baca profil sendiri.
create policy "pegawai_lihat_diri_sendiri"
on public.pegawai for select
to authenticated
using (id = auth.uid());

-- 7. Policy: admin dan kapus (Kepala Puskesmas) boleh baca semua data
--    pegawai. Tambah/ubah/hapus tetap khusus admin (lihat bawah).
create policy "admin_kapus_lihat_semua_pegawai"
on public.pegawai for select
to authenticated
using (public.peran_saya() in ('admin', 'kapus'));

-- 8. Policy: hanya admin boleh tambah pegawai baru.
create policy "admin_tambah_pegawai"
on public.pegawai for insert
to authenticated
with check (public.peran_saya() = 'admin');

-- 9. Policy: hanya admin boleh ubah data pegawai (termasuk ganti peran).
create policy "admin_ubah_pegawai"
on public.pegawai for update
to authenticated
using (public.peran_saya() = 'admin')
with check (public.peran_saya() = 'admin');

-- 10. Policy: hanya admin boleh hapus (nonaktifkan) pegawai.
create policy "admin_hapus_pegawai"
on public.pegawai for delete
to authenticated
using (public.peran_saya() = 'admin');

-- =========================================================
-- CATATAN SETUP AKUN ADMIN PERTAMA
-- Row-level security di atas mengharuskan MINIMAL SATU admin sudah ada
-- sebelum admin lain bisa ditambah lewat aplikasi. Untuk admin pertama:
--   1. Buat user lewat Supabase Auth (dashboard > Authentication > Add user),
--      atau lewat halaman signup jika diaktifkan.
--   2. Jalankan query ini SEKALI, ganti <UUID_USER> dan data di bawah:
--
-- insert into public.pegawai (id, nama_lengkap, jabatan, unit_kerja, peran)
-- values ('<UUID_USER>', 'Nama Admin', 'Kepala Tata Usaha', 'Manajemen', 'admin');
-- =========================================================

-- =========================================================
-- AKSES PER-KLASTER (banyak-ke-banyak, dengan level akses)
-- Satu pegawai bisa pegang lebih dari satu klaster, dan levelnya
-- per klaster bisa beda: 'layanan' (input data pasien) atau
-- 'penuh' (data + laporan lintas pasien di klaster itu).
-- =========================================================

-- 11. Daftar klaster layanan (struktur ILP Puskesmas).
--     kelompok dipakai buat pisahin klaster inti vs lintas klaster di UI.
create table public.klaster (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,        -- contoh: 'klaster_2', 'lintas_ugd'
  nama text not null,               -- contoh: 'Klaster 2 - Ibu dan Anak'
  kelompok text not null check (kelompok in ('klaster', 'lintas_klaster')),
  kode_antrian text,                -- huruf depan nomor antrian, null = gak ada antrian pasien
  urutan int not null default 0
);

insert into public.klaster (kode, nama, kelompok, kode_antrian, urutan) values
  ('klaster_1', 'Klaster 1 - Manajemen', 'klaster', null, 1),
  ('klaster_2', 'Klaster 2 - Ibu dan Anak', 'klaster', 'A', 2),
  ('klaster_3', 'Klaster 3 - Usia Produktif dan Lansia', 'klaster', 'B', 3),
  ('klaster_4', 'Klaster 4 - Penanggulangan Penyakit Menular', 'klaster', 'C', 4),
  ('lintas_ugd', 'Lintas Klaster - UGD', 'lintas_klaster', 'U', 5),
  ('lintas_ranap', 'Lintas Klaster - Rawat Inap', 'lintas_klaster', 'R', 6),
  ('lintas_lab', 'Lintas Klaster - Laboratorium', 'lintas_klaster', 'L', 7),
  ('lintas_farmasi', 'Lintas Klaster - Farmasi', 'lintas_klaster', 'F', 8),
  ('lintas_pendaftaran', 'Lintas Klaster - Pendaftaran', 'lintas_klaster', 'P', 9);

-- Klaster ini data referensi, boleh dibaca semua pegawai yang login.
alter table public.klaster enable row level security;

create policy "semua_pegawai_baca_klaster"
on public.klaster for select
to authenticated
using (true);

-- 12. Tabel penghubung pegawai <-> klaster, satu baris per klaster
--     yang diakses seorang pegawai.
create type public.level_akses_klaster as enum ('layanan', 'penuh');

create table public.akses_klaster (
  id uuid primary key default gen_random_uuid(),
  pegawai_id uuid not null references public.pegawai (id) on delete cascade,
  klaster_id uuid not null references public.klaster (id) on delete cascade,
  level_akses public.level_akses_klaster not null default 'layanan',
  dibuat_pada timestamptz not null default now(),
  unique (pegawai_id, klaster_id)   -- gak boleh dobel klaster yang sama
);

comment on table public.akses_klaster is 'Akses pegawai per klaster layanan, dengan level layanan/penuh';

alter table public.akses_klaster enable row level security;

-- Pegawai boleh lihat akses klaster milik sendiri.
create policy "pegawai_lihat_akses_klaster_sendiri"
on public.akses_klaster for select
to authenticated
using (pegawai_id = auth.uid());

-- Admin dan kapus boleh lihat semua akses klaster semua pegawai.
create policy "admin_kapus_lihat_semua_akses_klaster"
on public.akses_klaster for select
to authenticated
using (public.peran_saya() in ('admin', 'kapus'));

-- Hanya admin yang boleh atur (tambah/ubah/hapus) akses klaster pegawai.
create policy "admin_kelola_akses_klaster"
on public.akses_klaster for all
to authenticated
using (public.peran_saya() = 'admin')
with check (public.peran_saya() = 'admin');
-- =========================================================

-- =========================================================
-- LOKASI KERJA FISIK (Induk + Pustu) DAN POSYANDU
-- Beda dari klaster: ini SATU pegawai SATU lokasi (bukan banyak-ke-banyak).
-- =========================================================

-- 13. Daftar lokasi kerja: 1 Puskesmas Induk + 4 Pustu.
create table public.lokasi (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,
  nama text not null,
  tipe text not null check (tipe in ('induk', 'pustu')),
  urutan int not null default 0
);

insert into public.lokasi (kode, nama, tipe, urutan) values
  ('induk', 'Puskesmas Induk Bekawan', 'induk', 1),
  ('pustu_cahaya_baru', 'Pustu Cahaya Baru', 'pustu', 2),
  ('pustu_belaras', 'Pustu Belaras', 'pustu', 3),
  ('pustu_batang_sari', 'Pustu Batang Sari', 'pustu', 4),
  ('pustu_bidari', 'Pustu Bidari', 'pustu', 5);

alter table public.lokasi enable row level security;

create policy "semua_pegawai_baca_lokasi"
on public.lokasi for select
to authenticated
using (true);

-- 14. Posyandu di bawah tiap lokasi (2 posyandu per lokasi -> 10 total).
create table public.posyandu (
  id uuid primary key default gen_random_uuid(),
  lokasi_id uuid not null references public.lokasi (id) on delete cascade,
  nama text not null
);

insert into public.posyandu (lokasi_id, nama)
select l.id, l.nama || ' - Posyandu ' || n
from public.lokasi l
cross join generate_series(1, 2) as n;

alter table public.posyandu enable row level security;

create policy "semua_pegawai_baca_posyandu"
on public.posyandu for select
to authenticated
using (true);

-- 15. Tambah kolom lokasi kerja ke tabel pegawai. SATU pegawai SATU lokasi
--     (beda dari akses_klaster yang boleh banyak).
alter table public.pegawai
  add column lokasi_id uuid references public.lokasi (id);
-- =========================================================

-- =========================================================
-- MODUL PENDAFTARAN -- TAHAP 1: DATA PASIEN
-- =========================================================

-- 16. Nomor RM otomatis, format 5 digit: 00001, 00002, dst.
create sequence public.pasien_no_rm_seq start 1;

create table public.pasien (
  id uuid primary key default gen_random_uuid(),
  no_rm text unique not null default lpad(nextval('public.pasien_no_rm_seq')::text, 5, '0'),
  nik text unique,
  nama_lengkap text not null,
  tanggal_lahir date,
  jenis_kelamin text check (jenis_kelamin in ('L', 'P')),
  no_bpjs text,
  jenis_penjamin text check (jenis_penjamin in ('bpjs', 'umum')) default 'umum',
  alamat_jalan text,
  alamat_desa text,
  alamat_rt text,
  alamat_rw text,
  alamat_kecamatan text,
  alamat_kabupaten text,
  no_hp text,
  alergi text,
  dibuat_oleh uuid references public.pegawai (id),
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

comment on table public.pasien is 'Master data identitas pasien, No RM otomatis';

create trigger trg_pasien_diperbarui
before update on public.pasien
for each row execute function public.set_diperbarui_pada();

alter table public.pasien enable row level security;

-- Semua pegawai yang login boleh cari/lihat data pasien -- dibutuhkan
-- lintas peran (loket, dokter, perawat, bidan, dst).
create policy "semua_pegawai_lihat_pasien"
on public.pasien for select
to authenticated
using (true);

-- Semua pegawai boleh daftarkan pasien baru (termasuk saat gawat darurat,
-- bukan cuma loket).
create policy "semua_pegawai_tambah_pasien"
on public.pasien for insert
to authenticated
with check (true);

-- Ubah data pasien dibatasi ke peran yang relevan, bukan semua orang.
create policy "peran_terkait_ubah_pasien"
on public.pasien for update
to authenticated
using (public.peran_saya() in ('admin', 'loket_rm_kasir'))
with check (public.peran_saya() in ('admin', 'loket_rm_kasir'));
-- =========================================================

-- =========================================================
-- MODUL PENDAFTARAN -- TAHAP 2: PENDAFTARAN KUNJUNGAN
-- Satu baris = satu kedatangan pasien pada satu tanggal, ditujukan
-- ke satu klaster. Nomor antrian direset tiap hari, per klaster.
-- =========================================================

create table public.kunjungan (
  id uuid primary key default gen_random_uuid(),
  pasien_id uuid not null references public.pasien (id) on delete cascade,
  klaster_tujuan_id uuid not null references public.klaster (id),
  jenis_kunjungan text not null check (jenis_kunjungan in ('baru', 'lama', 'kontrol')),
  status text not null default 'menunggu' check (status in ('menunggu', 'dipanggil', 'selesai')),
  nomor_antrian int not null,
  tanggal date not null default current_date,
  dibuat_oleh uuid references public.pegawai (id),
  dibuat_pada timestamptz not null default now()
);

comment on table public.kunjungan is 'Pendaftaran kunjungan harian pasien ke klaster tujuan, dengan nomor antrian';

alter table public.kunjungan enable row level security;

-- Semua pegawai login boleh lihat kunjungan -- dipakai layar antrian nanti.
create policy "semua_pegawai_lihat_kunjungan"
on public.kunjungan for select
to authenticated
using (true);

-- Semua pegawai boleh daftarkan kunjungan baru.
create policy "semua_pegawai_tambah_kunjungan"
on public.kunjungan for insert
to authenticated
with check (true);

-- Update status (panggil/selesai) sementara dibuka untuk semua pegawai
-- login -- akan dipersempit ke pegawai yang punya akses klaster terkait
-- begitu modul Antrian (Tahap 3) dibangun.
create policy "semua_pegawai_ubah_status_kunjungan"
on public.kunjungan for update
to authenticated
using (true)
with check (true);
-- =========================================================

-- =========================================================
-- MODUL PENDAFTARAN -- TAHAP 2b: SKRINING AWAL / ANAMNESIS
-- Diisi bareng saat pendaftaran kunjungan, satu kunjungan satu skrining.
-- =========================================================

create table public.skrining (
  id uuid primary key default gen_random_uuid(),
  kunjungan_id uuid not null unique references public.kunjungan (id) on delete cascade,
  keluhan_utama text,
  tekanan_darah_sistolik int,
  tekanan_darah_diastolik int,
  nadi int,
  suhu numeric(4, 1),
  frekuensi_napas int,
  berat_badan numeric(5, 1),
  tinggi_badan numeric(5, 1),
  prioritas_triase text not null default 'hijau' check (prioritas_triase in ('hijau', 'kuning', 'merah')),
  catatan text,
  dibuat_oleh uuid references public.pegawai (id),
  dibuat_pada timestamptz not null default now()
);

comment on table public.skrining is 'Skrining awal/anamnesis, satu-satu dengan kunjungan';

alter table public.skrining enable row level security;

create policy "semua_pegawai_lihat_skrining"
on public.skrining for select
to authenticated
using (true);

create policy "semua_pegawai_tambah_skrining"
on public.skrining for insert
to authenticated
with check (true);
-- =========================================================

-- =========================================================
-- MODUL REKAM MEDIS
-- Satu catatan klinis per kunjungan, diisi dokter/perawat/bidan.
-- =========================================================

alter table public.pasien add column family_folder text;

create table public.catatan_klinis (
  id uuid primary key default gen_random_uuid(),
  kunjungan_id uuid not null unique references public.kunjungan (id) on delete cascade,
  diagnosis text,
  catatan_klinis text,
  tindakan text,
  dibuat_oleh uuid references public.pegawai (id),
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

comment on table public.catatan_klinis is 'Catatan klinis (SOAP ringkas) per kunjungan, satu-satu';

create trigger trg_catatan_klinis_diperbarui
before update on public.catatan_klinis
for each row execute function public.set_diperbarui_pada();

alter table public.catatan_klinis enable row level security;

-- Semua pegawai boleh baca (dibutuhkan lintas unit buat koordinasi nanti).
create policy "semua_pegawai_lihat_catatan_klinis"
on public.catatan_klinis for select
to authenticated
using (true);

-- Nulis/ubah catatan klinis dibatasi ke peran yang punya wewenang klinis.
create policy "peran_klinis_kelola_catatan_klinis"
on public.catatan_klinis for insert
to authenticated
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'));

create policy "peran_klinis_ubah_catatan_klinis"
on public.catatan_klinis for update
to authenticated
using (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'))
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'));
-- =========================================================

-- =========================================================
-- MODUL KASIR / PEMBAYARAN
-- Tarif layanan (master harga), shift kasir (buka/tutup),
-- tagihan per kunjungan (tunai/klaim BPJS).
-- =========================================================

-- 17. Master tarif layanan.
create table public.tarif_layanan (
  id uuid primary key default gen_random_uuid(),
  nama_layanan text not null,
  harga numeric(12, 0) not null default 0,
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now()
);

alter table public.tarif_layanan enable row level security;

create policy "semua_pegawai_lihat_tarif"
on public.tarif_layanan for select
to authenticated
using (true);

create policy "admin_kelola_tarif"
on public.tarif_layanan for all
to authenticated
using (public.peran_saya() = 'admin')
with check (public.peran_saya() = 'admin');

-- 18. Shift kasir -- satu baris per sesi buka-tutup kasir seorang pegawai.
create table public.shift_kasir (
  id uuid primary key default gen_random_uuid(),
  pegawai_id uuid not null references public.pegawai (id),
  modal_awal numeric(12, 0) not null default 0,
  kas_akhir numeric(12, 0),
  status text not null default 'buka' check (status in ('buka', 'tutup')),
  dibuka_pada timestamptz not null default now(),
  ditutup_pada timestamptz
);

alter table public.shift_kasir enable row level security;

create policy "pegawai_lihat_shift_sendiri"
on public.shift_kasir for select
to authenticated
using (pegawai_id = auth.uid() or public.peran_saya() = 'admin');

create policy "pegawai_buka_shift_sendiri"
on public.shift_kasir for insert
to authenticated
with check (pegawai_id = auth.uid());

create policy "pegawai_tutup_shift_sendiri"
on public.shift_kasir for update
to authenticated
using (pegawai_id = auth.uid() or public.peran_saya() = 'admin')
with check (pegawai_id = auth.uid() or public.peran_saya() = 'admin');

-- 19. Tagihan -- satu-satu dengan kunjungan.
create table public.tagihan (
  id uuid primary key default gen_random_uuid(),
  kunjungan_id uuid not null unique references public.kunjungan (id) on delete cascade,
  shift_id uuid references public.shift_kasir (id),
  jenis_penjamin_saat_bayar text,
  total_tagihan numeric(12, 0) not null default 0,
  status_pembayaran text not null default 'lunas' check (status_pembayaran in ('lunas', 'klaim_bpjs')),
  dibuat_oleh uuid references public.pegawai (id),
  dibuat_pada timestamptz not null default now()
);

alter table public.tagihan enable row level security;

create policy "semua_pegawai_lihat_tagihan"
on public.tagihan for select
to authenticated
using (true);

create policy "kasir_buat_tagihan"
on public.tagihan for insert
to authenticated
with check (public.peran_saya() in ('admin', 'loket_rm_kasir'));

-- 20. Rincian item per tagihan.
create table public.tagihan_item (
  id uuid primary key default gen_random_uuid(),
  tagihan_id uuid not null references public.tagihan (id) on delete cascade,
  nama_layanan text not null,
  harga numeric(12, 0) not null,
  qty int not null default 1,
  subtotal numeric(12, 0) not null
);

alter table public.tagihan_item enable row level security;

create policy "semua_pegawai_lihat_tagihan_item"
on public.tagihan_item for select
to authenticated
using (true);

create policy "kasir_buat_tagihan_item"
on public.tagihan_item for insert
to authenticated
with check (public.peran_saya() in ('admin', 'loket_rm_kasir'));

-- 21. Penjamin dipilih ULANG tiap kunjungan (bukan ngikut default pasien),
-- soalnya status aktif BPJS pasien bisa berubah tiap bulan. Idempotent,
-- aman dijalankan ulang.
alter table public.kunjungan
  add column if not exists jenis_penjamin text check (jenis_penjamin in ('bpjs', 'umum'));

comment on column public.kunjungan.jenis_penjamin is
  'Penjamin yang dipilih petugas saat kunjungan ini didaftarkan -- independen dari pasien.jenis_penjamin (default/master), karena status aktif BPJS pasien bisa beda tiap bulan.';
-- =========================================================

-- =========================================================
-- MODUL FARMASI / BHP (Bahan Habis Pakai) + CHECKLIST TINDAKAN
-- Perawat/dokter/bidan centang tindakan yang dilakukan, BHP yang kepake
-- otomatis kepotong dari stok (dengan default dari resep, bisa diedit).
-- =========================================================

-- 22. Tarif layanan diperluas: kategori (buat grouping tampilan) dan
--     klaster_terkait (opsional, buat filter tindakan per klaster).
alter table public.tarif_layanan
  add column if not exists kategori text not null default 'Umum',
  add column if not exists klaster_terkait_id uuid references public.klaster (id);

-- 23. Master BHP (bahan habis pakai): stok dilacak per item.
create table public.bhp (
  id uuid primary key default gen_random_uuid(),
  nama_bhp text not null,
  satuan text not null default 'pcs',
  stok_saat_ini numeric(12, 2) not null default 0,
  stok_minimum numeric(12, 2) not null default 0,
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now()
);

comment on table public.bhp is 'Master bahan habis pakai (BHP) dan stok berjalan';

alter table public.bhp enable row level security;

create policy "semua_pegawai_lihat_bhp"
on public.bhp for select
to authenticated
using (true);

create policy "farmasi_kelola_bhp"
on public.bhp for all
to authenticated
using (public.peran_saya() in ('admin', 'farmasi'))
with check (public.peran_saya() in ('admin', 'farmasi'));

-- 24. Riwayat mutasi stok BHP -- setiap kali stok berubah, tercatat di sini.
create table public.mutasi_stok_bhp (
  id uuid primary key default gen_random_uuid(),
  bhp_id uuid not null references public.bhp (id) on delete cascade,
  jenis text not null check (jenis in ('masuk', 'keluar', 'penyesuaian')),
  jumlah numeric(12, 2) not null,
  keterangan text,
  dibuat_oleh uuid references public.pegawai (id),
  dibuat_pada timestamptz not null default now()
);

alter table public.mutasi_stok_bhp enable row level security;

create policy "semua_pegawai_lihat_mutasi_bhp"
on public.mutasi_stok_bhp for select
to authenticated
using (true);

create policy "farmasi_catat_mutasi_bhp"
on public.mutasi_stok_bhp for insert
to authenticated
with check (public.peran_saya() in ('admin', 'farmasi'));

-- 25. Resep BHP per tindakan -- default pemakaian BHP kalau tindakan ini
--     dicentang, tinggal starting point yang bisa diedit pas dicatat.
create table public.resep_bhp_tindakan (
  id uuid primary key default gen_random_uuid(),
  tarif_layanan_id uuid not null references public.tarif_layanan (id) on delete cascade,
  bhp_id uuid not null references public.bhp (id) on delete cascade,
  jumlah_default numeric(12, 2) not null default 1,
  unique (tarif_layanan_id, bhp_id)
);

alter table public.resep_bhp_tindakan enable row level security;

create policy "semua_pegawai_lihat_resep_bhp"
on public.resep_bhp_tindakan for select
to authenticated
using (true);

create policy "farmasi_kelola_resep_bhp"
on public.resep_bhp_tindakan for all
to authenticated
using (public.peran_saya() in ('admin', 'farmasi'))
with check (public.peran_saya() in ('admin', 'farmasi'));

-- 26. Tindakan yang tercatat pada satu kunjungan (dari checklist di RM).
create table public.kunjungan_tindakan (
  id uuid primary key default gen_random_uuid(),
  kunjungan_id uuid not null references public.kunjungan (id) on delete cascade,
  tarif_layanan_id uuid not null references public.tarif_layanan (id),
  dibatalkan boolean not null default false,
  dicatat_oleh uuid references public.pegawai (id),
  dicatat_pada timestamptz not null default now()
);

alter table public.kunjungan_tindakan enable row level security;

create policy "semua_pegawai_lihat_kunjungan_tindakan"
on public.kunjungan_tindakan for select
to authenticated
using (true);

create policy "peran_klinis_catat_tindakan"
on public.kunjungan_tindakan for insert
to authenticated
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'));

create policy "peran_klinis_ubah_tindakan"
on public.kunjungan_tindakan for update
to authenticated
using (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'))
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'));

-- 27. BHP aktual yang kepake per tindakan (angka bisa beda dari resep default).
create table public.kunjungan_tindakan_bhp (
  id uuid primary key default gen_random_uuid(),
  kunjungan_tindakan_id uuid not null references public.kunjungan_tindakan (id) on delete cascade,
  bhp_id uuid not null references public.bhp (id),
  jumlah_terpakai numeric(12, 2) not null
);

alter table public.kunjungan_tindakan_bhp enable row level security;

create policy "semua_pegawai_lihat_kunjungan_tindakan_bhp"
on public.kunjungan_tindakan_bhp for select
to authenticated
using (true);

-- Baris ini SELALU ditulis lewat RPC catat_tindakan_kunjungan (security
-- definer) di bawah, jadi gak butuh policy insert langsung buat peran klinis.

-- 28. RPC: catat tindakan + potong stok BHP sekaligus, atomic (semua
--     berhasil atau semua batal, gak ada stok kepotong tanggung).
--     daftar_bhp: jsonb array [{ "bhp_id": "...", "jumlah": 2 }, ...]
create or replace function public.catat_tindakan_kunjungan(
  p_kunjungan_id uuid,
  p_tarif_layanan_id uuid,
  p_daftar_bhp jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tindakan_id uuid;
  v_item jsonb;
  v_bhp_id uuid;
  v_jumlah numeric;
begin
  if public.peran_saya() not in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan') then
    raise exception 'Cuma tenaga klinis yang boleh mencatat tindakan';
  end if;

  insert into public.kunjungan_tindakan (kunjungan_id, tarif_layanan_id, dicatat_oleh)
  values (p_kunjungan_id, p_tarif_layanan_id, auth.uid())
  returning id into v_tindakan_id;

  for v_item in select * from jsonb_array_elements(p_daftar_bhp)
  loop
    v_bhp_id := (v_item->>'bhp_id')::uuid;
    v_jumlah := (v_item->>'jumlah')::numeric;

    if v_jumlah > 0 then
      insert into public.kunjungan_tindakan_bhp (kunjungan_tindakan_id, bhp_id, jumlah_terpakai)
      values (v_tindakan_id, v_bhp_id, v_jumlah);

      update public.bhp set stok_saat_ini = stok_saat_ini - v_jumlah where id = v_bhp_id;

      insert into public.mutasi_stok_bhp (bhp_id, jenis, jumlah, keterangan, dibuat_oleh)
      values (v_bhp_id, 'keluar', v_jumlah, 'Otomatis dari tindakan kunjungan', auth.uid());
    end if;
  end loop;

  return v_tindakan_id;
end;
$$;

-- 29. RPC: batalkan tindakan, balikin stok BHP yang udah kepotong.
create or replace function public.batalkan_tindakan_kunjungan(p_tindakan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_baris record;
begin
  if public.peran_saya() not in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan') then
    raise exception 'Cuma tenaga klinis yang boleh membatalkan tindakan';
  end if;

  for v_baris in
    select bhp_id, jumlah_terpakai from public.kunjungan_tindakan_bhp
    where kunjungan_tindakan_id = p_tindakan_id
  loop
    update public.bhp set stok_saat_ini = stok_saat_ini + v_baris.jumlah_terpakai where id = v_baris.bhp_id;

    insert into public.mutasi_stok_bhp (bhp_id, jenis, jumlah, keterangan, dibuat_oleh)
    values (v_baris.bhp_id, 'masuk', v_baris.jumlah_terpakai, 'Pembatalan tindakan', auth.uid());
  end loop;

  update public.kunjungan_tindakan set dibatalkan = true where id = p_tindakan_id;
end;
$$;
-- =========================================================
-- =========================================================

-- =========================================================
-- TAHAP 3: RUJUKAN (antar lokasi Pustu/Induk + eksternal ke RS)
-- =========================================================

-- 30. Lokasi kerja pegawai yang sedang login (dipakai di policy rujukan).
create or replace function public.lokasi_saya()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select lokasi_id from public.pegawai where id = auth.uid();
$$;

-- 31. Rujukan pasien.
--     internal  = antar lokasi sendiri (mis. Pustu -> Puskesmas Induk)
--     eksternal = ke fasilitas lain (mis. Puskesmas Induk -> RS rujukan)
create table public.rujukan (
  id uuid primary key default gen_random_uuid(),
  pasien_id uuid not null references public.pasien (id) on delete cascade,
  kunjungan_id uuid references public.kunjungan (id) on delete set null,
  jenis text not null check (jenis in ('internal', 'eksternal')),
  dari_lokasi_id uuid not null references public.lokasi (id),
  ke_lokasi_id uuid references public.lokasi (id),
  tujuan_eksternal text,
  poli_tujuan text,
  diagnosis text,
  alasan text not null,
  status text not null default 'dibuat' check (status in ('dibuat', 'diterima', 'selesai', 'dibatalkan')),
  catatan_tindak_lanjut text,
  dibuat_oleh uuid references public.pegawai (id),
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now(),
  check (
    (jenis = 'internal' and ke_lokasi_id is not null and ke_lokasi_id <> dari_lokasi_id)
    or (jenis = 'eksternal' and tujuan_eksternal is not null and length(trim(tujuan_eksternal)) > 0)
  )
);

comment on table public.rujukan is 'Rujukan pasien: internal antar lokasi (Pustu/Induk) atau eksternal ke faskes/RS rujukan';

create index idx_rujukan_ke_lokasi on public.rujukan (ke_lokasi_id, status);
create index idx_rujukan_pasien on public.rujukan (pasien_id);

create trigger trg_rujukan_diperbarui
before update on public.rujukan
for each row execute function public.set_diperbarui_pada();

alter table public.rujukan enable row level security;

create policy "semua_pegawai_lihat_rujukan"
on public.rujukan for select
to authenticated
using (true);

create policy "peran_klinis_buat_rujukan"
on public.rujukan for insert
to authenticated
with check (
  dibuat_oleh = auth.uid()
  and public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan')
);

-- Ubah status: admin, pembuat rujukan, atau pegawai di lokasi tujuan
-- (rujukan internal).
create policy "admin_pembuat_penerima_ubah_rujukan"
on public.rujukan for update
to authenticated
using (
  public.peran_saya() = 'admin'
  or dibuat_oleh = auth.uid()
  or (ke_lokasi_id is not null and ke_lokasi_id = public.lokasi_saya())
)
with check (true);
-- =========================================================

-- =========================================================
-- TAHAP 4: NOTIFIKASI RUJUKAN MASUK (Supabase Realtime)
--
-- Aplikasi mendengarkan perubahan tabel rujukan lewat Realtime supaya
-- petugas di lokasi tujuan langsung dapat notifikasi. Realtime cuma jalan
-- kalau tabelnya masuk publication `supabase_realtime`.
--
-- Aman dijalankan berulang kali. Tidak mengubah/menghapus data.
-- Jalankan SEKALI di Supabase SQL Editor.
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rujukan'
  ) then
    alter publication supabase_realtime add table public.rujukan;
  end if;
end $$;
-- =========================================================

-- =========================================================
-- TAHAP 5: RUJUKAN TIDAK LAGI BERGANTUNG PADA DATA PASIEN INDUK
--
-- Pasien Pustu punya No. RM sendiri dan tidak harus terdaftar di
-- Puskesmas Induk. Rujukan sekarang menyimpan salinan identitas pasien
-- (snapshot) di barisnya sendiri, dan pasien_id jadi opsional.
--
-- Data lama aman: rujukan yang sudah ada diisi otomatis dari tabel pasien.
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor.
-- =========================================================

-- 1. pasien_id boleh kosong (pasien Pustu yang belum terdaftar di Induk).
alter table public.rujukan alter column pasien_id drop not null;

-- 2. Kolom salinan identitas pasien.
alter table public.rujukan
  add column if not exists pasien_no_rm_asal text,        -- No. RM di lokasi asal (RM Pustu / RM Induk)
  add column if not exists pasien_nama text,
  add column if not exists pasien_nik text,
  add column if not exists pasien_tanggal_lahir date,
  add column if not exists pasien_jenis_kelamin text,
  add column if not exists pasien_alamat text,
  add column if not exists pasien_jenis_penjamin text,
  add column if not exists pasien_no_bpjs text,
  add column if not exists pasien_alergi text;

-- 3. Isi rujukan lama dari tabel pasien.
update public.rujukan r
set
  pasien_no_rm_asal = p.no_rm,
  pasien_nama = p.nama_lengkap,
  pasien_nik = p.nik,
  pasien_tanggal_lahir = p.tanggal_lahir,
  pasien_jenis_kelamin = p.jenis_kelamin,
  pasien_alamat = nullif(
    concat_ws(
      ', ',
      nullif(p.alamat_jalan, ''),
      case when nullif(p.alamat_rt, '') is not null then 'RT ' || p.alamat_rt end,
      case when nullif(p.alamat_rw, '') is not null then 'RW ' || p.alamat_rw end,
      nullif(p.alamat_desa, ''),
      nullif(p.alamat_kecamatan, ''),
      nullif(p.alamat_kabupaten, '')
    ),
    ''
  ),
  pasien_jenis_penjamin = p.jenis_penjamin,
  pasien_no_bpjs = p.no_bpjs,
  pasien_alergi = p.alergi
from public.pasien p
where r.pasien_id = p.id
  and r.pasien_nama is null;

-- 4. Nama pasien wajib ada di setiap rujukan.
alter table public.rujukan alter column pasien_nama set not null;

alter table public.rujukan drop constraint if exists rujukan_pasien_nama_check;
alter table public.rujukan
  add constraint rujukan_pasien_nama_check check (length(trim(pasien_nama)) > 0);

alter table public.rujukan drop constraint if exists rujukan_pasien_jenis_kelamin_check;
alter table public.rujukan
  add constraint rujukan_pasien_jenis_kelamin_check
  check (pasien_jenis_kelamin is null or pasien_jenis_kelamin in ('L', 'P'));

alter table public.rujukan drop constraint if exists rujukan_pasien_jenis_penjamin_check;
alter table public.rujukan
  add constraint rujukan_pasien_jenis_penjamin_check
  check (pasien_jenis_penjamin is null or pasien_jenis_penjamin in ('bpjs', 'umum'));
-- =========================================================

-- =========================================================
-- TAHAP 6: KONDISI KLINIS DI SURAT RUJUKAN
--
-- Rujukan (terutama ke IGD rumah sakit) harus memuat keluhan, tanda vital,
-- pemeriksaan, dan terapi yang sudah diberikan. Semua disimpan di baris
-- rujukan itu sendiri, jadi pasien Pustu yang tidak ada di data Induk tetap
-- bisa dirujuk lengkap.
--
-- Rujukan lama tidak diubah (kolom baru kosong; surat cetak lama tetap
-- membaca skrining kunjungan seperti sebelumnya).
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor.
-- =========================================================

alter table public.rujukan
  add column if not exists keluhan_utama text,
  add column if not exists td_sistolik int,
  add column if not exists td_diastolik int,
  add column if not exists nadi int,
  add column if not exists frekuensi_napas int,
  add column if not exists suhu numeric(4, 1),
  add column if not exists spo2 int,
  add column if not exists gcs int,
  add column if not exists berat_badan numeric(5, 1),
  add column if not exists pemeriksaan_fisik text,
  add column if not exists pemeriksaan_penunjang text,
  add column if not exists terapi_diberikan text;

-- Batas wajar supaya salah ketik (mis. suhu 366) ditolak database.
alter table public.rujukan drop constraint if exists rujukan_ttv_check;
alter table public.rujukan
  add constraint rujukan_ttv_check check (
    (td_sistolik is null or td_sistolik between 40 and 300)
    and (td_diastolik is null or td_diastolik between 20 and 200)
    and (nadi is null or nadi between 20 and 250)
    and (frekuensi_napas is null or frekuensi_napas between 5 and 80)
    and (suhu is null or suhu between 30 and 45)
    and (spo2 is null or spo2 between 50 and 100)
    and (gcs is null or gcs between 3 and 15)
    and (berat_badan is null or berat_badan between 0.5 and 400)
  );
-- =========================================================

-- =========================================================
-- TAHAP 7: (A) CATATAN KLINIS FORMAT SOAP
--          (B) NOTIFIKASI STATUS RUJUKAN UNTUK LOKASI PEMBUAT (PUSTU)
--
-- Jalankan SEKALI di Supabase SQL Editor. Tidak ada data yang dihapus.
-- =========================================================

-- ---------- A. SOAP ----------
-- Pemetaan kolom:
--   S (Subjektif)  = subjektif     (baru)
--   O (Objektif)   = objektif      (baru)
--   A (Asesmen)    = diagnosis     (sudah ada)
--   P (Plan)       = tindakan      (sudah ada, terapi / rencana)
-- Kolom lama catatan_klinis (teks bebas) disalin ke objektif, lalu tidak
-- dipakai lagi oleh aplikasi. Kolomnya sengaja dibiarkan supaya data aman.
alter table public.catatan_klinis
  add column if not exists subjektif text,
  add column if not exists objektif text;

update public.catatan_klinis
set objektif = catatan_klinis
where objektif is null
  and catatan_klinis is not null;

comment on column public.catatan_klinis.subjektif is 'SOAP - S: keluhan dan anamnesis';
comment on column public.catatan_klinis.objektif is 'SOAP - O: pemeriksaan fisik dan penunjang';
comment on column public.catatan_klinis.diagnosis is 'SOAP - A: asesmen / diagnosis';
comment on column public.catatan_klinis.tindakan is 'SOAP - P: terapi dan rencana';
comment on column public.catatan_klinis.catatan_klinis is 'LAMA (sebelum SOAP): sudah disalin ke objektif, tidak dipakai lagi';

-- ---------- B. Penanda pembaruan rujukan sudah dilihat ----------
-- Pustu (pembuat rujukan internal) mendapat notifikasi saat rujukannya
-- diterima / selesai di Induk. Tabel ini mencatat pembaruan mana yang
-- sudah dilihat tiap pegawai, supaya lencana notifikasi hilang setelah dibuka.
create table if not exists public.rujukan_status_dibaca (
  pegawai_id uuid not null references public.pegawai (id) on delete cascade,
  rujukan_id uuid not null references public.rujukan (id) on delete cascade,
  status text not null,
  dibaca_pada timestamptz not null default now(),
  primary key (pegawai_id, rujukan_id, status)
);

comment on table public.rujukan_status_dibaca is 'Pembaruan status rujukan (diterima/selesai) yang sudah dilihat tiap pegawai';

alter table public.rujukan_status_dibaca enable row level security;

drop policy if exists "pegawai_lihat_dibaca_sendiri" on public.rujukan_status_dibaca;
create policy "pegawai_lihat_dibaca_sendiri"
on public.rujukan_status_dibaca for select
to authenticated
using (pegawai_id = auth.uid());

drop policy if exists "pegawai_tandai_dibaca_sendiri" on public.rujukan_status_dibaca;
create policy "pegawai_tandai_dibaca_sendiri"
on public.rujukan_status_dibaca for insert
to authenticated
with check (pegawai_id = auth.uid());

-- Query notifikasi menyaring rujukan berdasarkan lokasi asal + status.
create index if not exists idx_rujukan_dari_lokasi on public.rujukan (dari_lokasi_id, status);
-- =========================================================

-- =========================================================
-- TAHAP 8: (A) WAKTU TUNGGU KUNJUNGAN
--          (B) SURVEI KEPUASAN PASIEN
--
-- Jalankan SEKALI di Supabase SQL Editor. Tidak ada data yang dihapus.
-- =========================================================

-- ---------- A. Jam dipanggil & selesai, buat hitung rata-rata waktu tunggu ----------
-- Diisi otomatis oleh trigger setiap kali status kunjungan berubah, jadi
-- kode aplikasi yang sudah ada (halaman Antrian, Pelayanan) tidak perlu diubah.
alter table public.kunjungan
  add column if not exists dipanggil_pada timestamptz,
  add column if not exists selesai_pada timestamptz;

create or replace function public.catat_waktu_status_kunjungan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'dipanggil' and old.status is distinct from 'dipanggil' and new.dipanggil_pada is null then
    new.dipanggil_pada := now();
  end if;
  if new.status = 'selesai' and old.status is distinct from 'selesai' and new.selesai_pada is null then
    new.selesai_pada := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_catat_waktu_status_kunjungan on public.kunjungan;
create trigger trg_catat_waktu_status_kunjungan
before update on public.kunjungan
for each row
execute function public.catat_waktu_status_kunjungan();

-- ---------- B. Survei kepuasan pasien ----------
-- Diisi pasien sendiri lewat halaman publik /survei (tanpa login), jadi
-- insert dibuka untuk peran anon. Hanya admin & kapus yang boleh membaca
-- hasilnya (lewat halaman Laporan Kepuasan).
create table if not exists public.survei_kepuasan (
  id uuid primary key default gen_random_uuid(),
  klaster_id uuid references public.klaster (id) on delete set null,
  nama_pasien text,
  no_rm text,
  nilai text not null check (nilai in ('sangat_puas', 'puas', 'cukup', 'kurang_puas')),
  saran text,
  dibuat_pada timestamptz not null default now()
);

comment on table public.survei_kepuasan is 'Survei kepuasan pasien, diisi mandiri lewat halaman publik /survei';

alter table public.survei_kepuasan enable row level security;

drop policy if exists "siapa_saja_isi_survei" on public.survei_kepuasan;
create policy "siapa_saja_isi_survei"
on public.survei_kepuasan for insert
to anon, authenticated
with check (
  nilai in ('sangat_puas', 'puas', 'cukup', 'kurang_puas')
  and (saran is null or length(saran) <= 2000)
  and (nama_pasien is null or length(nama_pasien) <= 200)
  and (no_rm is null or length(no_rm) <= 30)
);

drop policy if exists "admin_kapus_baca_survei" on public.survei_kepuasan;
create policy "admin_kapus_baca_survei"
on public.survei_kepuasan for select
to authenticated
using (public.peran_saya() in ('admin', 'kapus'));

drop policy if exists "siapa_saja_baca_klaster_untuk_survei" on public.klaster;
create policy "siapa_saja_baca_klaster_untuk_survei"
on public.klaster for select
to anon
using (true);
create index if not exists idx_survei_kepuasan_dibuat_pada on public.survei_kepuasan (dibuat_pada);
-- =========================================================
-- =========================================================
-- TAHAP 9: (A) Perbaikan enum peran yang belum lengkap
--          (B) Kebijakan kelola Klaster (khusus admin)
--          (C) Log Aktivitas -- audit trail 5 tabel penting
--
-- Jalankan SEKALI di Supabase SQL Editor. Tidak ada data yang dihapus.
-- =========================================================

-- ---------- A. Enum peran_akses (instalasi baru) ----------
-- Sudah dirapikan langsung di definisi tipe peran_akses di atas (baris ~9):
-- 'dokter_gigi', 'manajemen', 'tenaga_gizi', 'kesling', 'promkes' sudah
-- didaftarkan dari awal. Instalasi database yang SUDAH JALAN gak bisa
-- ubah enum yang sudah dipakai kayak gini -- pakai migrasi_tahap_9.sql
-- yang isinya ALTER TYPE ... ADD VALUE, dijalankan sekali di SQL Editor.

-- ---------- B. Klaster cuma bisa dibaca, belum ada kebijakan ubah ----------
-- Dari awal cuma ada policy select di tabel klaster -- gak ada policy
-- insert/update/delete sama sekali, jadi RLS default-nya nolak semua
-- percobaan ubah walau dari akun admin.
drop policy if exists "admin_kelola_klaster" on public.klaster;
create policy "admin_kelola_klaster"
on public.klaster for all
to authenticated
using (public.peran_saya() = 'admin')
with check (public.peran_saya() = 'admin');

-- ---------- C. Log Aktivitas ----------
-- Satu tabel log buat 5 tabel penting: pasien, kunjungan, catatan_klinis,
-- tagihan, pegawai. Ditulis otomatis lewat trigger (security definer), jadi
-- gak ada jalur insert manual dari aplikasi dan gak nambah kode di modul
-- yang sudah ada.
create table if not exists public.log_aktivitas (
  id uuid primary key default gen_random_uuid(),
  tabel text not null,
  baris_id uuid not null,
  aksi text not null check (aksi in ('insert', 'update', 'delete')),
  data_lama jsonb,
  data_baru jsonb,
  dilakukan_oleh uuid references public.pegawai (id),
  dilakukan_pada timestamptz not null default now()
);

comment on table public.log_aktivitas is
  'Audit trail otomatis lewat trigger: siapa ubah apa, kapan, isi sebelum/sesudahnya';

create or replace function public.catat_log_aktivitas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.log_aktivitas (tabel, baris_id, aksi, data_lama, data_baru, dilakukan_oleh)
  values (
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    lower(TG_OP),
    case when TG_OP in ('update', 'delete') then to_jsonb(old) else null end,
    case when TG_OP in ('update', 'insert') then to_jsonb(new) else null end,
    auth.uid()
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_log_pasien on public.pasien;
create trigger trg_log_pasien
after insert or update or delete on public.pasien
for each row execute function public.catat_log_aktivitas();

drop trigger if exists trg_log_kunjungan on public.kunjungan;
create trigger trg_log_kunjungan
after insert or update or delete on public.kunjungan
for each row execute function public.catat_log_aktivitas();

drop trigger if exists trg_log_catatan_klinis on public.catatan_klinis;
create trigger trg_log_catatan_klinis
after insert or update or delete on public.catatan_klinis
for each row execute function public.catat_log_aktivitas();

drop trigger if exists trg_log_tagihan on public.tagihan;
create trigger trg_log_tagihan
after insert or update or delete on public.tagihan
for each row execute function public.catat_log_aktivitas();

drop trigger if exists trg_log_pegawai on public.pegawai;
create trigger trg_log_pegawai
after insert or update or delete on public.pegawai
for each row execute function public.catat_log_aktivitas();

alter table public.log_aktivitas enable row level security;

drop policy if exists "admin_kapus_baca_log" on public.log_aktivitas;
create policy "admin_kapus_baca_log"
on public.log_aktivitas for select
to authenticated
using (public.peran_saya() in ('admin', 'kapus'));

create index if not exists idx_log_aktivitas_tabel_waktu on public.log_aktivitas (tabel, dilakukan_pada desc);
-- =========================================================
-- =========================================================
-- TAHAP 10: (A) Kebijakan kelola Lokasi & Posyandu (khusus admin)
--           (B) Kode ICD-10 di catatan klinis (buat Laporan LB1)
--           (C) Tabel capaian SPM (input manual per periode)
--
-- Jalankan SEKALI di Supabase SQL Editor. Tidak ada data yang dihapus.
-- =========================================================

-- ---------- A. Lokasi & Posyandu cuma bisa dibaca ----------
-- Sama seperti klaster dulu: dari awal cuma ada policy select, gak ada
-- insert/update/delete -- jadi menu Master Data yang baru gak bisa nyimpen
-- apa-apa kalau ini gak ditambah.
drop policy if exists "admin_kelola_lokasi" on public.lokasi;
create policy "admin_kelola_lokasi"
on public.lokasi for all
to authenticated
using (public.peran_saya() = 'admin')
with check (public.peran_saya() = 'admin');

drop policy if exists "admin_kelola_posyandu" on public.posyandu;
create policy "admin_kelola_posyandu"
on public.posyandu for all
to authenticated
using (public.peran_saya() = 'admin')
with check (public.peran_saya() = 'admin');

-- ---------- B. Kode ICD-10 ----------
-- Opsional, diisi manual oleh dokter/perawat/bidan saat isi Asesmen (SOAP).
-- Dipakai buat rekap Laporan LB1 per kode -- BUKAN pemetaan otomatis ke
-- ~50 kategori resmi Kemenkes (tabel pemetaan itu gak ada di sistem ini),
-- jadi laporannya rekap apa adanya berdasar kode yang diketik petugas.
alter table public.catatan_klinis
  add column if not exists kode_icd10 text;

comment on column public.catatan_klinis.kode_icd10 is
  'Kode ICD-10 opsional, diisi manual, dasar rekap Laporan LB1 per kode (bukan kategori resmi Kemenkes)';

-- ---------- C. Capaian SPM (input manual) ----------
-- 12 indikator SPM bidang kesehatan (Permenkes 4/2019) butuh data program
-- yang belum ada di SIMPUS ini (ANC per kehamilan, imunisasi, skrining PTM
-- usia produktif/lansia, program TB/HIV/ODGJ, dst) -- jadi capaiannya TIDAK
-- dihitung otomatis dari data kunjungan, supaya gak nampilin angka yang
-- kelihatan resmi padahal sebenarnya cuma tebakan kasar. Ini cuma tempat
-- input manual (dari hitungan program masing-masing) biar kerekap rapi dan
-- bisa dicetak per bulan, bukan sumber kebenaran datanya.
create table if not exists public.spm_capaian (
  id uuid primary key default gen_random_uuid(),
  bulan int not null check (bulan between 1 and 12),
  tahun int not null,
  kode_indikator text not null,
  nama_indikator text not null,
  jumlah_capaian numeric,
  jumlah_target numeric,
  catatan text,
  diisi_oleh uuid references public.pegawai (id),
  diperbarui_pada timestamptz not null default now(),
  unique (bulan, tahun, kode_indikator)
);

comment on table public.spm_capaian is
  'Input manual capaian 12 indikator SPM per bulan -- bukan hasil hitung otomatis dari data kunjungan';

create trigger trg_spm_capaian_diperbarui
before update on public.spm_capaian
for each row execute function public.set_diperbarui_pada();

alter table public.spm_capaian enable row level security;

drop policy if exists "admin_kapus_baca_spm" on public.spm_capaian;
create policy "admin_kapus_baca_spm"
on public.spm_capaian for select
to authenticated
using (public.peran_saya() in ('admin', 'kapus'));

drop policy if exists "admin_kapus_isi_spm" on public.spm_capaian;
create policy "admin_kapus_isi_spm"
on public.spm_capaian for insert
to authenticated
with check (public.peran_saya() in ('admin', 'kapus'));

drop policy if exists "admin_kapus_ubah_spm" on public.spm_capaian;
create policy "admin_kapus_ubah_spm"
on public.spm_capaian for update
to authenticated
using (public.peran_saya() in ('admin', 'kapus'))
with check (public.peran_saya() in ('admin', 'kapus'));
-- =========================================================

-- =========================================================
-- TAHAP 11: PELAYANAN KLASTER 2 -- IBU (ANC) DAN ANAK (TUMBUH KEMBANG/MTBS)
--
-- Dua tabel baru, satu-satu dengan kunjungan, sama pola dengan
-- catatan_klinis/skrining. Diisi lewat halaman Pelayanan yang sudah ada,
-- muncul cuma kalau kunjungan ditujukan ke Klaster 2 (kode 'klaster_2').
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor.
-- =========================================================

-- ---------- A. Pelayanan Ibu (ANC / kehamilan) ----------
create table if not exists public.pelayanan_ibu (
  id uuid primary key default gen_random_uuid(),
  kunjungan_id uuid not null unique references public.kunjungan (id) on delete cascade,
  usia_kehamilan_minggu int,
  gravida int,
  para int,
  abortus int,
  hpht date,
  hpl date,
  td_sistolik int,
  td_diastolik int,
  berat_badan numeric(5, 1),
  lila numeric(4, 1),
  tfu numeric(4, 1),
  djj int,
  status_risiko text not null default 'rendah' check (status_risiko in ('rendah', 'tinggi')),
  faktor_risiko text,
  catatan text,
  dibuat_oleh uuid references public.pegawai (id),
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

comment on table public.pelayanan_ibu is 'Data ANC/kehamilan Klaster 2, satu-satu dengan kunjungan';

alter table public.pelayanan_ibu drop constraint if exists pelayanan_ibu_check;
alter table public.pelayanan_ibu
  add constraint pelayanan_ibu_check check (
    (usia_kehamilan_minggu is null or usia_kehamilan_minggu between 0 and 45)
    and (gravida is null or gravida between 0 and 20)
    and (para is null or para between 0 and 20)
    and (abortus is null or abortus between 0 and 20)
    and (td_sistolik is null or td_sistolik between 40 and 300)
    and (td_diastolik is null or td_diastolik between 20 and 200)
    and (berat_badan is null or berat_badan between 0.5 and 400)
    and (lila is null or lila between 10 and 50)
    and (tfu is null or tfu between 5 and 50)
    and (djj is null or djj between 60 and 220)
  );

drop trigger if exists trg_pelayanan_ibu_diperbarui on public.pelayanan_ibu;
create trigger trg_pelayanan_ibu_diperbarui
before update on public.pelayanan_ibu
for each row execute function public.set_diperbarui_pada();

alter table public.pelayanan_ibu enable row level security;

drop policy if exists "semua_pegawai_lihat_pelayanan_ibu" on public.pelayanan_ibu;
create policy "semua_pegawai_lihat_pelayanan_ibu"
on public.pelayanan_ibu for select
to authenticated
using (true);

drop policy if exists "peran_klinis_kelola_pelayanan_ibu" on public.pelayanan_ibu;
create policy "peran_klinis_kelola_pelayanan_ibu"
on public.pelayanan_ibu for insert
to authenticated
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'));

drop policy if exists "peran_klinis_ubah_pelayanan_ibu" on public.pelayanan_ibu;
create policy "peran_klinis_ubah_pelayanan_ibu"
on public.pelayanan_ibu for update
to authenticated
using (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'))
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'));

-- ---------- B. Pelayanan Anak (tumbuh kembang / MTBS) ----------
create table if not exists public.pelayanan_anak (
  id uuid primary key default gen_random_uuid(),
  kunjungan_id uuid not null unique references public.kunjungan (id) on delete cascade,
  berat_badan numeric(5, 1),
  panjang_tinggi_badan numeric(5, 1),
  lingkar_kepala numeric(4, 1),
  status_gizi text check (status_gizi in ('gizi_buruk', 'gizi_kurang', 'gizi_baik', 'gizi_lebih')),
  status_tumbuh_kembang text check (status_tumbuh_kembang in ('sesuai', 'meragukan', 'penyimpangan')),
  klasifikasi_mtbs text,
  keluhan text,
  catatan text,
  rencana_tindak_lanjut text,
  dibuat_oleh uuid references public.pegawai (id),
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

comment on table public.pelayanan_anak is 'Data tumbuh kembang/MTBS anak Klaster 2, satu-satu dengan kunjungan';

alter table public.pelayanan_anak drop constraint if exists pelayanan_anak_check;
alter table public.pelayanan_anak
  add constraint pelayanan_anak_check check (
    (berat_badan is null or berat_badan between 0.5 and 400)
    and (panjang_tinggi_badan is null or panjang_tinggi_badan between 20 and 200)
    and (lingkar_kepala is null or lingkar_kepala between 20 and 60)
  );

drop trigger if exists trg_pelayanan_anak_diperbarui on public.pelayanan_anak;
create trigger trg_pelayanan_anak_diperbarui
before update on public.pelayanan_anak
for each row execute function public.set_diperbarui_pada();

alter table public.pelayanan_anak enable row level security;

drop policy if exists "semua_pegawai_lihat_pelayanan_anak" on public.pelayanan_anak;
create policy "semua_pegawai_lihat_pelayanan_anak"
on public.pelayanan_anak for select
to authenticated
using (true);

drop policy if exists "peran_klinis_kelola_pelayanan_anak" on public.pelayanan_anak;
create policy "peran_klinis_kelola_pelayanan_anak"
on public.pelayanan_anak for insert
to authenticated
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'));

drop policy if exists "peran_klinis_ubah_pelayanan_anak" on public.pelayanan_anak;
create policy "peran_klinis_ubah_pelayanan_anak"
on public.pelayanan_anak for update
to authenticated
using (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'))
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'));
-- =========================================================

-- =========================================================
-- TAHAP 12: SKRINING TERSTRUKTUR & IMUNISASI KLASTER 2
--
-- Beda dari pelayanan_ibu/pelayanan_anak (satu-satu per kunjungan), dua
-- tabel ini BISA BANYAK BARIS per kunjungan (misal 1 kunjungan = skrining
-- SDIDTK + MTBS, atau 2 vaksin sekaligus). Pola batal pakai kolom
-- 'dibatalkan', sama seperti kunjungan_tindakan -- gak dihapus, cuma ditandai.
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor.
-- =========================================================

-- ---------- A. Skrining terstruktur (SDIDTK/MTBS/MTBM/gizi/anemia/psikososial) ----------
create table if not exists public.skrining_klaster2 (
  id uuid primary key default gen_random_uuid(),
  kunjungan_id uuid not null references public.kunjungan (id) on delete cascade,
  jenis_skrining text not null check (
    jenis_skrining in ('sdidtk', 'mtbs', 'mtbm', 'gizi', 'anemia', 'psikososial')
  ),
  hasil_pemeriksaan text,
  klasifikasi text,
  masalah_ditemukan text,
  tindakan text,
  edukasi text,
  rujukan text,
  tindak_lanjut text,
  dibatalkan boolean not null default false,
  dicatat_oleh uuid references public.pegawai (id),
  dicatat_pada timestamptz not null default now()
);

comment on table public.skrining_klaster2 is 'Skrining terstruktur Klaster 2 (SDIDTK/MTBS/MTBM/gizi/anemia/psikososial), banyak baris per kunjungan';

create index if not exists idx_skrining_klaster2_kunjungan on public.skrining_klaster2 (kunjungan_id);

alter table public.skrining_klaster2 enable row level security;

drop policy if exists "semua_pegawai_lihat_skrining_klaster2" on public.skrining_klaster2;
create policy "semua_pegawai_lihat_skrining_klaster2"
on public.skrining_klaster2 for select
to authenticated
using (true);

drop policy if exists "peran_klinis_kelola_skrining_klaster2" on public.skrining_klaster2;
create policy "peran_klinis_kelola_skrining_klaster2"
on public.skrining_klaster2 for insert
to authenticated
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'));

drop policy if exists "peran_klinis_ubah_skrining_klaster2" on public.skrining_klaster2;
create policy "peran_klinis_ubah_skrining_klaster2"
on public.skrining_klaster2 for update
to authenticated
using (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'))
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'));

-- ---------- B. Imunisasi (pemberian & riwayat) ----------
create table if not exists public.pemberian_imunisasi (
  id uuid primary key default gen_random_uuid(),
  kunjungan_id uuid not null references public.kunjungan (id) on delete cascade,
  pasien_id uuid not null references public.pasien (id) on delete cascade,
  jenis_vaksin text not null,
  dosis text,
  rute text check (rute in ('IM', 'SC', 'ID', 'Oral')),
  nomor_batch text,
  tanggal_kedaluwarsa date,
  tanggal_pemberian date not null default current_date,
  reaksi_kipi text,
  jadwal_berikutnya date,
  dibatalkan boolean not null default false,
  diberikan_oleh uuid references public.pegawai (id),
  dicatat_pada timestamptz not null default now()
);

comment on table public.pemberian_imunisasi is 'Pemberian & riwayat imunisasi Klaster 2, banyak baris per kunjungan/pasien';

create index if not exists idx_pemberian_imunisasi_kunjungan on public.pemberian_imunisasi (kunjungan_id);
create index if not exists idx_pemberian_imunisasi_pasien on public.pemberian_imunisasi (pasien_id);

alter table public.pemberian_imunisasi enable row level security;

drop policy if exists "semua_pegawai_lihat_pemberian_imunisasi" on public.pemberian_imunisasi;
create policy "semua_pegawai_lihat_pemberian_imunisasi"
on public.pemberian_imunisasi for select
to authenticated
using (true);

drop policy if exists "peran_klinis_kelola_pemberian_imunisasi" on public.pemberian_imunisasi;
create policy "peran_klinis_kelola_pemberian_imunisasi"
on public.pemberian_imunisasi for insert
to authenticated
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'));

drop policy if exists "peran_klinis_ubah_pemberian_imunisasi" on public.pemberian_imunisasi;
create policy "peran_klinis_ubah_pemberian_imunisasi"
on public.pemberian_imunisasi for update
to authenticated
using (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'))
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'));
-- =========================================================

-- =========================================================
-- TAHAP 13: MUTU & KESELAMATAN PASIEN
--
-- Modul puskesmas-wide (bukan cuma Klaster 2) buat catat insiden,
-- keluhan, dan ketidaklengkapan rekam medis + tindak lanjutnya.
-- Siapa aja pegawai boleh lapor; admin/kapus yang kelola tindak lanjut.
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor.
-- =========================================================

create table if not exists public.mutu_insiden (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null default current_date,
  kunjungan_id uuid references public.kunjungan (id) on delete set null,
  jenis text not null check (jenis in ('insiden', 'keluhan', 'ketidaklengkapan_rm')),
  uraian text not null,
  tingkat_risiko text not null default 'rendah' check (tingkat_risiko in ('rendah', 'sedang', 'tinggi')),
  pelapor_id uuid references public.pegawai (id),
  tindakan_awal text,
  penanggung_jawab_id uuid references public.pegawai (id),
  batas_waktu date,
  status_tindak_lanjut text not null default 'baru' check (status_tindak_lanjut in ('baru', 'proses', 'selesai')),
  bukti_penyelesaian text,
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

comment on table public.mutu_insiden is 'Pencatatan insiden/keluhan/ketidaklengkapan RM dan tindak lanjut mutu, lintas klaster';

create index if not exists idx_mutu_insiden_tanggal on public.mutu_insiden (tanggal);

drop trigger if exists trg_mutu_insiden_diperbarui on public.mutu_insiden;
create trigger trg_mutu_insiden_diperbarui
before update on public.mutu_insiden
for each row execute function public.set_diperbarui_pada();

alter table public.mutu_insiden enable row level security;

drop policy if exists "semua_pegawai_lihat_mutu_insiden" on public.mutu_insiden;
create policy "semua_pegawai_lihat_mutu_insiden"
on public.mutu_insiden for select
to authenticated
using (true);

drop policy if exists "semua_pegawai_lapor_mutu_insiden" on public.mutu_insiden;
create policy "semua_pegawai_lapor_mutu_insiden"
on public.mutu_insiden for insert
to authenticated
with check (true);

drop policy if exists "admin_kapus_kelola_mutu_insiden" on public.mutu_insiden;
create policy "admin_kapus_kelola_mutu_insiden"
on public.mutu_insiden for update
to authenticated
using (public.peran_saya() in ('admin', 'kapus'))
with check (public.peran_saya() in ('admin', 'kapus'));
-- =========================================================

-- =========================================================
-- TAHAP 14: MANAJEMEN SDM -- DOKUMEN KREDENSIAL PEGAWAI
--
-- Nempel ke pegawai yang sudah ada: catat STR/SIP/SIK/pelatihan/sertifikat
-- + tanggal kedaluwarsa, biar Dashboard Manajemen bisa nampilin yang mau
-- kedaluwarsa. Aman dijalankan berulang kali. Jalankan SEKALI di SQL Editor.
-- =========================================================

create table if not exists public.pegawai_dokumen (
  id uuid primary key default gen_random_uuid(),
  pegawai_id uuid not null references public.pegawai (id) on delete cascade,
  jenis text not null check (jenis in ('str', 'sip', 'sik', 'pelatihan', 'sertifikat_lain')),
  nomor text,
  nama_dokumen text,
  tanggal_terbit date,
  tanggal_kedaluwarsa date,
  catatan text,
  dibuat_pada timestamptz not null default now()
);

comment on table public.pegawai_dokumen is 'Dokumen kredensial pegawai (STR/SIP/SIK/pelatihan/sertifikat) buat Manajemen SDM';

create index if not exists idx_pegawai_dokumen_pegawai on public.pegawai_dokumen (pegawai_id);

alter table public.pegawai_dokumen enable row level security;

drop policy if exists "semua_pegawai_lihat_pegawai_dokumen" on public.pegawai_dokumen;
create policy "semua_pegawai_lihat_pegawai_dokumen"
on public.pegawai_dokumen for select
to authenticated
using (true);

drop policy if exists "manajemen_kelola_pegawai_dokumen" on public.pegawai_dokumen;
create policy "manajemen_kelola_pegawai_dokumen"
on public.pegawai_dokumen for insert
to authenticated
with check (public.peran_saya() in ('admin', 'kapus', 'manajemen'));

drop policy if exists "manajemen_ubah_pegawai_dokumen" on public.pegawai_dokumen;
create policy "manajemen_ubah_pegawai_dokumen"
on public.pegawai_dokumen for update
to authenticated
using (public.peran_saya() in ('admin', 'kapus', 'manajemen'))
with check (public.peran_saya() in ('admin', 'kapus', 'manajemen'));

drop policy if exists "manajemen_hapus_pegawai_dokumen" on public.pegawai_dokumen;
create policy "manajemen_hapus_pegawai_dokumen"
on public.pegawai_dokumen for delete
to authenticated
using (public.peran_saya() in ('admin', 'kapus', 'manajemen'));
-- =========================================================

-- =========================================================
-- TAHAP 15: KEUANGAN INTERNAL -- PENGELUARAN & KAS HARIAN
--
-- Sisi pendapatan udah ada lewat tabel 'tagihan' (kasir). Ini nambah sisi
-- pengeluaran + alur persetujuan sederhana, biar bisa hitung kas bersih.
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor.
-- =========================================================

create table if not exists public.pengeluaran_internal (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null default current_date,
  kategori text not null,
  jumlah numeric(14, 2) not null check (jumlah > 0),
  keterangan text,
  diajukan_oleh uuid references public.pegawai (id),
  status text not null default 'diajukan' check (status in ('diajukan', 'disetujui', 'ditolak')),
  disetujui_oleh uuid references public.pegawai (id),
  dibuat_pada timestamptz not null default now()
);

comment on table public.pengeluaran_internal is 'Pengajuan & persetujuan pengeluaran internal, buat hitung kas harian Keuangan Internal';

create index if not exists idx_pengeluaran_internal_tanggal on public.pengeluaran_internal (tanggal);

alter table public.pengeluaran_internal enable row level security;

drop policy if exists "semua_pegawai_lihat_pengeluaran_internal" on public.pengeluaran_internal;
create policy "semua_pegawai_lihat_pengeluaran_internal"
on public.pengeluaran_internal for select
to authenticated
using (true);

drop policy if exists "keuangan_ajukan_pengeluaran_internal" on public.pengeluaran_internal;
create policy "keuangan_ajukan_pengeluaran_internal"
on public.pengeluaran_internal for insert
to authenticated
with check (public.peran_saya() in ('admin', 'kapus', 'bendahara_bok', 'manajemen'));

drop policy if exists "keuangan_setujui_pengeluaran_internal" on public.pengeluaran_internal;
create policy "keuangan_setujui_pengeluaran_internal"
on public.pengeluaran_internal for update
to authenticated
using (public.peran_saya() in ('admin', 'kapus', 'bendahara_bok'))
with check (public.peran_saya() in ('admin', 'kapus', 'bendahara_bok'));
-- =========================================================

-- =========================================================
-- TAHAP 16: MANAJEMEN RISIKO -- REGISTER RISIKO
--
-- Beda dari Mutu (mutu_insiden = kejadian yang SUDAH terjadi), ini buat
-- risiko yang diidentifikasi SEBELUM kejadian + rencana mitigasinya.
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor.
-- =========================================================

create table if not exists public.risiko_manajemen (
  id uuid primary key default gen_random_uuid(),
  kategori text not null check (kategori in ('pelayanan', 'sdm', 'logistik', 'keamanan_data', 'lainnya')),
  uraian text not null,
  penyebab text,
  level_risiko text not null default 'rendah' check (level_risiko in ('rendah', 'sedang', 'tinggi')),
  rencana_mitigasi text,
  penanggung_jawab_id uuid references public.pegawai (id),
  status text not null default 'teridentifikasi' check (status in ('teridentifikasi', 'dalam_mitigasi', 'terkendali')),
  dibuat_oleh uuid references public.pegawai (id),
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

comment on table public.risiko_manajemen is 'Register risiko: identifikasi, level, mitigasi, dan status pengendalian';

create index if not exists idx_risiko_manajemen_status on public.risiko_manajemen (status);

drop trigger if exists trg_risiko_manajemen_diperbarui on public.risiko_manajemen;
create trigger trg_risiko_manajemen_diperbarui
before update on public.risiko_manajemen
for each row execute function public.set_diperbarui_pada();

alter table public.risiko_manajemen enable row level security;

drop policy if exists "semua_pegawai_lihat_risiko_manajemen" on public.risiko_manajemen;
create policy "semua_pegawai_lihat_risiko_manajemen"
on public.risiko_manajemen for select
to authenticated
using (true);

drop policy if exists "manajemen_kelola_risiko" on public.risiko_manajemen;
create policy "manajemen_kelola_risiko"
on public.risiko_manajemen for insert
to authenticated
with check (public.peran_saya() in ('admin', 'kapus', 'manajemen'));

drop policy if exists "manajemen_ubah_risiko" on public.risiko_manajemen;
create policy "manajemen_ubah_risiko"
on public.risiko_manajemen for update
to authenticated
using (public.peran_saya() in ('admin', 'kapus', 'manajemen'))
with check (public.peran_saya() in ('admin', 'kapus', 'manajemen'));
-- =========================================================
