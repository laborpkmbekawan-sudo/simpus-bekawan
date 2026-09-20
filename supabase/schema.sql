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
  'dokter',
  'perawat',
  'bidan',
  'farmasi',
  'laboratorium',
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
