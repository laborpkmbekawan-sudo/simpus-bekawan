-- =========================================================
-- MIGRASI TAHAP 46 -- MODUL LABORATORIUM (tahap 4)
--
-- Fitur 7: Nilai Kritis + catatan lapor ke dokter/perawat.
--          Parameter angka bisa diberi batas kritis (di bawah/di atas).
--          Hasil yang melewati batas ditandai KRITIS. Lab wajib mencatat
--          siapa yang dihubungi (read-back); sampai dicatat, permintaan
--          muncul di peringatan antrean Lab.
-- Fitur 8: Rujukan Lab Keluar.
--          Pemeriksaan yang tidak bisa dikerjakan di Puskesmas dikirim ke
--          RS/lab rujukan. Item dikeluarkan dari proses lab internal
--          (tidak ditagih, tidak potong BHP), hasil dari luar dicatat
--          dan terbaca oleh klaster peminta.
--
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor
-- SETELAH migrasi_tahap_45.sql.
-- =========================================================

-- 1. Batas kritis per parameter (hanya tipe angka, berlaku umum L/P).
alter table public.lab_parameter
  add column if not exists kritis_min numeric,
  add column if not exists kritis_max numeric;

comment on column public.lab_parameter.kritis_min is 'Hasil di bawah angka ini ditandai KRITIS (kosong = tidak ada batas bawah kritis)';
comment on column public.lab_parameter.kritis_max is 'Hasil di atas angka ini ditandai KRITIS (kosong = tidak ada batas atas kritis)';

-- 2. Penanda kritis pada hasil (dihitung server saat hasil disimpan).
alter table public.lab_hasil
  add column if not exists kritis boolean not null default false;

create index if not exists idx_lab_hasil_kritis on public.lab_hasil (item_id) where kritis;

-- 3. Catatan pelaporan nilai kritis pada permintaan.
alter table public.lab_permintaan
  add column if not exists kritis_dilaporkan_pada timestamptz,
  add column if not exists kritis_dilaporkan_ke text,
  add column if not exists kritis_dilaporkan_oleh uuid references public.pegawai (id),
  add column if not exists kritis_dilaporkan_oleh_nama text,
  add column if not exists kritis_catatan text;

-- 4. Rujukan lab keluar.
create table if not exists public.lab_rujukan_keluar (
  id uuid primary key default gen_random_uuid(),
  permintaan_id uuid not null references public.lab_permintaan (id) on delete cascade,
  item_id uuid references public.lab_permintaan_item (id) on delete set null,
  pemeriksaan_id uuid references public.lab_pemeriksaan (id) on delete set null,
  nama_pemeriksaan text not null,
  tujuan text not null,
  alasan text,
  status text not null default 'dikirim' check (status in ('dikirim', 'hasil_diterima', 'dibatalkan')),
  dikirim_pada timestamptz not null default now(),
  dikirim_oleh uuid references public.pegawai (id),
  dikirim_oleh_nama text,
  hasil_teks text,
  hasil_diterima_pada timestamptz,
  hasil_dicatat_oleh_nama text
);

comment on table public.lab_rujukan_keluar is 'Pemeriksaan lab yang dirujuk ke RS/lab luar beserta hasil yang kembali';

create index if not exists idx_lab_rujukan_keluar_permintaan on public.lab_rujukan_keluar (permintaan_id);
create index if not exists idx_lab_rujukan_keluar_status on public.lab_rujukan_keluar (status, dikirim_pada);
-- Satu item cuma boleh punya satu rujukan aktif.
create unique index if not exists uq_lab_rujukan_keluar_item_aktif
  on public.lab_rujukan_keluar (item_id) where status <> 'dibatalkan';

alter table public.lab_rujukan_keluar enable row level security;

drop policy if exists "semua_pegawai_lihat_lab_rujukan_keluar" on public.lab_rujukan_keluar;
create policy "semua_pegawai_lihat_lab_rujukan_keluar"
on public.lab_rujukan_keluar for select to authenticated using (true);

drop policy if exists "lab_buat_lab_rujukan_keluar" on public.lab_rujukan_keluar;
create policy "lab_buat_lab_rujukan_keluar"
on public.lab_rujukan_keluar for insert to authenticated
with check (public.peran_saya() in ('admin', 'laboratorium'));

drop policy if exists "lab_ubah_lab_rujukan_keluar" on public.lab_rujukan_keluar;
create policy "lab_ubah_lab_rujukan_keluar"
on public.lab_rujukan_keluar for update to authenticated
using (public.peran_saya() in ('admin', 'laboratorium'))
with check (public.peran_saya() in ('admin', 'laboratorium'));

drop trigger if exists trg_log_lab_rujukan_keluar on public.lab_rujukan_keluar;
create trigger trg_log_lab_rujukan_keluar
after insert or update or delete on public.lab_rujukan_keluar
for each row execute function public.catat_log_aktivitas();

notify pgrst, 'reload schema';
