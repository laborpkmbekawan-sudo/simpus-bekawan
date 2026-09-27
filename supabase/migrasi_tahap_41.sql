-- =========================================================
-- TAHAP 41: MASTER DATA OBAT + MUTASI STOK OBAT
--
-- Tabel obat terpisah dari bhp (bahan habis pakai). Obat punya
-- kategori (Antibiotik, Analgesik, dst) dan bentuk_sediaan
-- (Tablet, Sirup, dst) buat filter/tampilan di Farmasi.
-- Pola sama persis kayak bhp + mutasi_stok_bhp (tahap 23-24).
--
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL
-- Editor.
-- =========================================================

create table if not exists public.obat (
  id uuid primary key default gen_random_uuid(),
  nama_obat text not null,
  kategori text not null default 'Lain-lain',
  bentuk_sediaan text not null default 'Tablet',
  satuan text not null default 'Tablet',
  stok_saat_ini numeric(12, 2) not null default 0,
  stok_minimum numeric(12, 2) not null default 0,
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now()
);

comment on table public.obat is 'Master data obat dan stok berjalan (terpisah dari BHP)';

create index if not exists idx_obat_kategori on public.obat (kategori);

alter table public.obat enable row level security;

drop policy if exists "semua_pegawai_lihat_obat" on public.obat;
create policy "semua_pegawai_lihat_obat"
on public.obat for select
to authenticated
using (true);

drop policy if exists "farmasi_kelola_obat" on public.obat;
create policy "farmasi_kelola_obat"
on public.obat for all
to authenticated
using (public.peran_saya() in ('admin', 'farmasi'))
with check (public.peran_saya() in ('admin', 'farmasi'));

create table if not exists public.mutasi_stok_obat (
  id uuid primary key default gen_random_uuid(),
  obat_id uuid not null references public.obat (id) on delete cascade,
  jenis text not null check (jenis in ('masuk', 'keluar', 'penyesuaian')),
  jumlah numeric(12, 2) not null,
  keterangan text,
  dibuat_oleh uuid references public.pegawai (id),
  dibuat_pada timestamptz not null default now()
);

create index if not exists idx_mutasi_stok_obat_obat on public.mutasi_stok_obat (obat_id);

alter table public.mutasi_stok_obat enable row level security;

drop policy if exists "semua_pegawai_lihat_mutasi_obat" on public.mutasi_stok_obat;
create policy "semua_pegawai_lihat_mutasi_obat"
on public.mutasi_stok_obat for select
to authenticated
using (true);

drop policy if exists "farmasi_catat_mutasi_obat" on public.mutasi_stok_obat;
create policy "farmasi_catat_mutasi_obat"
on public.mutasi_stok_obat for insert
to authenticated
with check (public.peran_saya() in ('admin', 'farmasi'));
-- =========================================================
