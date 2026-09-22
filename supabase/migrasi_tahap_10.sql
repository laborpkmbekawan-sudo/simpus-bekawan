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
