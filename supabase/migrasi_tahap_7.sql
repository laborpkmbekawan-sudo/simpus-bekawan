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
