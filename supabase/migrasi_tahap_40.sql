-- =========================================================
-- TAHAP 40: KLASTER 3 -- SKRINING GERIATRI TERSTRUKTUR (ADL KATZ & GDS-15)
--
-- Ganti opsi "Skrining Geriatri" yang tadinya cuma teks bebas di
-- skrining_klaster3 jadi instrumen terstruktur:
--  - ADL (Activity Daily Living) 6 item ala Indeks Katz -- tiap item
--    dijawab mandiri/tergantung, skor 0-6.
--  - GDS-15 (Geriatric Depression Scale, Yesavage & Sheikh 1986) --
--    15 pertanyaan ya/tidak, skor 0-15.
-- Skor & kategori dihitung ulang di server action (bukan percaya
-- input klien), sama pola dengan skrining_keswa (SRQ-20). Data lama
-- di skrining_klaster3 dengan jenis_skrining = 'skrining_geriatri'
-- TIDAK dipindah otomatis -- tetap ada sebagai riwayat lama, form
-- baru ke depannya pakai tabel ini.
--
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL
-- Editor.
-- =========================================================

create table if not exists public.skrining_geriatri (
  id uuid primary key default gen_random_uuid(),
  kunjungan_id uuid not null references public.kunjungan (id) on delete cascade,
  -- ADL Katz: tiap kolom true = mandiri untuk fungsi itu, false = butuh bantuan.
  adl_mandi boolean not null default false,
  adl_berpakaian boolean not null default false,
  adl_ke_toilet boolean not null default false,
  adl_berpindah boolean not null default false,
  adl_kontinensia boolean not null default false,
  adl_makan boolean not null default false,
  adl_skor int not null default 0 check (adl_skor between 0 and 6),
  adl_kategori text not null default 'mandiri' check (
    adl_kategori in ('mandiri', 'ketergantungan_ringan', 'ketergantungan_sedang', 'ketergantungan_berat')
  ),
  -- GDS-15: nomor soal (1-15) yang dijawab "Ya" oleh pasien (arah jawaban
  -- apa adanya, bukan skor -- konversi ke skor ada di server action karena
  -- sebagian soal "Ya"=1 poin dan sebagian lain "Tidak"=1 poin).
  gds_jawaban_ya smallint[] not null default '{}',
  gds_skor int not null default 0 check (gds_skor between 0 and 15),
  gds_kategori text not null default 'normal' check (
    gds_kategori in ('normal', 'depresi_ringan', 'depresi_sedang', 'depresi_berat')
  ),
  catatan text,
  tindak_lanjut text,
  dibatalkan boolean not null default false,
  dicatat_oleh uuid references public.pegawai (id),
  dicatat_pada timestamptz not null default now()
);

comment on table public.skrining_geriatri is
  'Skrining geriatri terstruktur Klaster 3 (ADL Katz 6 item + GDS-15), banyak baris per kunjungan lansia';

create index if not exists idx_skrining_geriatri_kunjungan on public.skrining_geriatri (kunjungan_id);

alter table public.skrining_geriatri enable row level security;

drop policy if exists "semua_pegawai_lihat_skrining_geriatri" on public.skrining_geriatri;
create policy "semua_pegawai_lihat_skrining_geriatri"
on public.skrining_geriatri for select
to authenticated
using (true);

drop policy if exists "peran_klinis_kelola_skrining_geriatri" on public.skrining_geriatri;
create policy "peran_klinis_kelola_skrining_geriatri"
on public.skrining_geriatri for insert
to authenticated
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan', 'tenaga_gizi'));

drop policy if exists "peran_klinis_ubah_skrining_geriatri" on public.skrining_geriatri;
create policy "peran_klinis_ubah_skrining_geriatri"
on public.skrining_geriatri for update
to authenticated
using (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan', 'tenaga_gizi'))
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan', 'tenaga_gizi'));
-- =========================================================
