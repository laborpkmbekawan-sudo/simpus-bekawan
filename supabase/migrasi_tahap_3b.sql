-- =========================================================
-- TAHAP 3b: RUJUKAN dirombak jadi antar LOKASI (Pustu <-> Induk) dan
-- ke RS/faskes eksternal. Fitur Koordinasi Antar Unit DIHAPUS.
--
-- PERHATIAN: dua tabel lama (koordinasi_unit dan rujukan versi klaster)
-- dihapus beserta isinya. Isinya cuma data uji dari tahap 3.
-- Jalankan SEKALI di Supabase SQL Editor.
-- =========================================================

drop table if exists public.koordinasi_unit cascade;
drop table if exists public.rujukan cascade;

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
