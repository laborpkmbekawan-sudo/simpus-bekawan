-- =========================================================
-- MIGRASI TAHAP 50 -- LABORATORIUM: PUSTU (fitur 15)
--
-- Mengikuti menu "Pustu" di referensi siLab:
--   Pustu: input hasil pemeriksaan, input stok BHP & reagen, riwayat laporan.
--   Lab Induk: terima laporan Pustu, verifikasi / kembalikan, atur
--   pemeriksaan apa yang boleh dikerjakan tiap Pustu.
--
-- Pasien Pustu punya No. RM Pustu sendiri dan TIDAK harus terdaftar di
-- Induk, jadi laporan menyimpan salinan identitas pasien (snapshot),
-- tidak memakai tabel pasien/kunjungan.
--
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor
-- SETELAH migrasi_tahap_49.sql.
-- =========================================================

-- 0. Helper: tipe lokasi kerja pegawai yang sedang login ('induk' / 'pustu').
create or replace function public.lokasi_tipe_saya()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select l.tipe
  from public.pegawai p
  join public.lokasi l on l.id = p.lokasi_id
  where p.id = auth.uid();
$$;

revoke all on function public.lokasi_tipe_saya() from public;
grant execute on function public.lokasi_tipe_saya() to authenticated;

create sequence if not exists public.lab_pustu_no_seq;

-- 1. Pemeriksaan yang boleh dikerjakan per Pustu (diatur Lab Induk).
create table if not exists public.lab_pustu_izin (
  id uuid primary key default gen_random_uuid(),
  lokasi_id uuid not null references public.lokasi (id) on delete cascade,
  pemeriksaan_id uuid not null references public.lab_pemeriksaan (id) on delete cascade,
  unique (lokasi_id, pemeriksaan_id)
);

comment on table public.lab_pustu_izin is 'Pemeriksaan lab yang diizinkan dikerjakan di tiap Pustu';

create index if not exists idx_lab_pustu_izin_lokasi on public.lab_pustu_izin (lokasi_id);

alter table public.lab_pustu_izin enable row level security;

drop policy if exists "semua_pegawai_lihat_lab_pustu_izin" on public.lab_pustu_izin;
create policy "semua_pegawai_lihat_lab_pustu_izin"
on public.lab_pustu_izin for select to authenticated using (true);

drop policy if exists "lab_kelola_lab_pustu_izin" on public.lab_pustu_izin;
create policy "lab_kelola_lab_pustu_izin"
on public.lab_pustu_izin for all to authenticated
using (public.peran_saya() in ('admin', 'laboratorium'))
with check (public.peran_saya() in ('admin', 'laboratorium'));

drop trigger if exists trg_log_lab_pustu_izin on public.lab_pustu_izin;
create trigger trg_log_lab_pustu_izin
after insert or update or delete on public.lab_pustu_izin
for each row execute function public.catat_log_aktivitas();

-- 2. Laporan hasil pemeriksaan dari Pustu (satu laporan = satu pasien,
--    satu pemeriksaan/paket).
create table if not exists public.lab_pustu_laporan (
  id uuid primary key default gen_random_uuid(),
  no_laporan text unique not null default ('LPU-' || lpad(nextval('public.lab_pustu_no_seq')::text, 5, '0')),
  lokasi_id uuid not null references public.lokasi (id),
  pemeriksaan_id uuid not null references public.lab_pemeriksaan (id),
  -- Salinan nama pemeriksaan supaya riwayat tetap benar kalau katalog diubah.
  nama_pemeriksaan text not null,
  -- Identitas pasien (snapshot, RM Pustu sendiri).
  no_rm_pustu text,
  nama_pasien text not null check (length(btrim(nama_pasien)) > 0),
  jenis_kelamin text check (jenis_kelamin in ('L', 'P')),
  tanggal_lahir date,
  tanggal_periksa date not null default current_date,
  catatan text,
  status text not null default 'terkirim'
    check (status in ('terkirim', 'diverifikasi', 'dikembalikan')),
  dicatat_oleh uuid references public.pegawai (id),
  dicatat_oleh_nama text,
  dibuat_pada timestamptz not null default now(),
  diverifikasi_oleh uuid references public.pegawai (id),
  diverifikasi_oleh_nama text,
  diverifikasi_pada timestamptz,
  catatan_verifikasi text,
  diperbarui_pada timestamptz not null default now()
);

comment on table public.lab_pustu_laporan is 'Laporan hasil pemeriksaan lab dari Pustu ke Lab Induk (pasien RM Pustu, snapshot identitas)';

create index if not exists idx_lab_pustu_laporan_lokasi on public.lab_pustu_laporan (lokasi_id, tanggal_periksa desc);
create index if not exists idx_lab_pustu_laporan_status on public.lab_pustu_laporan (status, dibuat_pada desc);

-- Dikembalikan butuh alasan; laporan yang sudah diverifikasi dikunci.
create or replace function public.lab_pustu_laporan_jaga()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'diverifikasi' then
    raise exception 'Laporan yang sudah diverifikasi tidak bisa diubah.';
  end if;
  if new.status = 'dikembalikan' and nullif(btrim(coalesce(new.catatan_verifikasi, '')), '') is null then
    raise exception 'Alasan pengembalian wajib diisi.';
  end if;
  if new.status = 'diverifikasi' and new.diverifikasi_pada is null then
    new.diverifikasi_pada := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lab_pustu_laporan_jaga on public.lab_pustu_laporan;
create trigger trg_lab_pustu_laporan_jaga
before update on public.lab_pustu_laporan
for each row execute function public.lab_pustu_laporan_jaga();

drop trigger if exists trg_lab_pustu_laporan_diperbarui on public.lab_pustu_laporan;
create trigger trg_lab_pustu_laporan_diperbarui
before update on public.lab_pustu_laporan
for each row execute function public.set_diperbarui_pada();

alter table public.lab_pustu_laporan enable row level security;

-- Pustu lihat laporan lokasinya sendiri; Lab/admin/kapus lihat semua.
drop policy if exists "lihat_lab_pustu_laporan" on public.lab_pustu_laporan;
create policy "lihat_lab_pustu_laporan"
on public.lab_pustu_laporan for select to authenticated
using (
  public.peran_saya() in ('admin', 'kapus', 'laboratorium')
  or lokasi_id = public.lokasi_saya()
);

-- Petugas Pustu cuma boleh membuat laporan untuk lokasinya sendiri.
drop policy if exists "pustu_buat_lab_pustu_laporan" on public.lab_pustu_laporan;
create policy "pustu_buat_lab_pustu_laporan"
on public.lab_pustu_laporan for insert to authenticated
with check (
  public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan')
  and public.lokasi_tipe_saya() = 'pustu'
  and lokasi_id = public.lokasi_saya()
);

-- Lab/admin verifikasi atau kembalikan.
drop policy if exists "lab_ubah_lab_pustu_laporan" on public.lab_pustu_laporan;
create policy "lab_ubah_lab_pustu_laporan"
on public.lab_pustu_laporan for update to authenticated
using (public.peran_saya() in ('admin', 'laboratorium'))
with check (public.peran_saya() in ('admin', 'laboratorium'));

-- Tidak ada policy delete: jejak laporan tidak dihapus.

drop trigger if exists trg_log_lab_pustu_laporan on public.lab_pustu_laporan;
create trigger trg_log_lab_pustu_laporan
after insert or update or delete on public.lab_pustu_laporan
for each row execute function public.catat_log_aktivitas();

-- 3. Hasil per parameter (snapshot nama/satuan/rujukan).
create table if not exists public.lab_pustu_hasil (
  id uuid primary key default gen_random_uuid(),
  laporan_id uuid not null references public.lab_pustu_laporan (id) on delete cascade,
  parameter_id uuid references public.lab_parameter (id) on delete set null,
  nama_parameter text not null,
  satuan text,
  rujukan_teks text,
  nilai text not null,
  flag text check (flag in ('normal', 'rendah', 'tinggi', 'abnormal')),
  urutan int not null default 0,
  unique (laporan_id, parameter_id)
);

comment on table public.lab_pustu_hasil is 'Hasil per parameter dalam laporan lab Pustu';

create index if not exists idx_lab_pustu_hasil_laporan on public.lab_pustu_hasil (laporan_id, urutan);

alter table public.lab_pustu_hasil enable row level security;

drop policy if exists "lihat_lab_pustu_hasil" on public.lab_pustu_hasil;
create policy "lihat_lab_pustu_hasil"
on public.lab_pustu_hasil for select to authenticated
using (
  exists (
    select 1 from public.lab_pustu_laporan l
    where l.id = laporan_id
      and (
        public.peran_saya() in ('admin', 'kapus', 'laboratorium')
        or l.lokasi_id = public.lokasi_saya()
      )
  )
);

drop policy if exists "pustu_catat_lab_pustu_hasil" on public.lab_pustu_hasil;
create policy "pustu_catat_lab_pustu_hasil"
on public.lab_pustu_hasil for insert to authenticated
with check (
  public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan')
  and exists (
    select 1 from public.lab_pustu_laporan l
    where l.id = laporan_id
      and l.lokasi_id = public.lokasi_saya()
      and l.status = 'terkirim'
  )
);

drop trigger if exists trg_log_lab_pustu_hasil on public.lab_pustu_hasil;
create trigger trg_log_lab_pustu_hasil
after insert or update or delete on public.lab_pustu_hasil
for each row execute function public.catat_log_aktivitas();

-- 4. Laporan stok BHP & reagen Pustu (per bulan, per barang). Stok Pustu
--    terpisah dari tabel bhp Induk, jadi dicatat sebagai laporan bulanan.
create table if not exists public.lab_pustu_stok (
  id uuid primary key default gen_random_uuid(),
  lokasi_id uuid not null references public.lokasi (id),
  periode date not null,
  nama_barang text not null check (length(btrim(nama_barang)) > 0),
  jenis text not null default 'bhp' check (jenis in ('bhp', 'reagen')),
  satuan text not null default 'pcs',
  stok_awal numeric(12, 2) not null default 0 check (stok_awal >= 0),
  masuk numeric(12, 2) not null default 0 check (masuk >= 0),
  dipakai numeric(12, 2) not null default 0 check (dipakai >= 0),
  stok_akhir numeric(12, 2) generated always as (stok_awal + masuk - dipakai) stored,
  stok_minimum numeric(12, 2) not null default 0 check (stok_minimum >= 0),
  tanggal_kadaluarsa date,
  catatan text,
  dicatat_oleh uuid references public.pegawai (id),
  dicatat_oleh_nama text,
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now(),
  -- periode selalu tanggal 1 bulan itu
  check (extract(day from periode) = 1),
  unique (lokasi_id, periode, nama_barang)
);

comment on table public.lab_pustu_stok is 'Laporan bulanan stok BHP & reagen lab per Pustu (stok_akhir dihitung otomatis)';

create index if not exists idx_lab_pustu_stok_lokasi on public.lab_pustu_stok (lokasi_id, periode desc);

drop trigger if exists trg_lab_pustu_stok_diperbarui on public.lab_pustu_stok;
create trigger trg_lab_pustu_stok_diperbarui
before update on public.lab_pustu_stok
for each row execute function public.set_diperbarui_pada();

alter table public.lab_pustu_stok enable row level security;

drop policy if exists "lihat_lab_pustu_stok" on public.lab_pustu_stok;
create policy "lihat_lab_pustu_stok"
on public.lab_pustu_stok for select to authenticated
using (
  public.peran_saya() in ('admin', 'kapus', 'laboratorium')
  or lokasi_id = public.lokasi_saya()
);

drop policy if exists "pustu_catat_lab_pustu_stok" on public.lab_pustu_stok;
create policy "pustu_catat_lab_pustu_stok"
on public.lab_pustu_stok for insert to authenticated
with check (
  public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan')
  and public.lokasi_tipe_saya() = 'pustu'
  and lokasi_id = public.lokasi_saya()
);

drop policy if exists "pustu_ubah_lab_pustu_stok" on public.lab_pustu_stok;
create policy "pustu_ubah_lab_pustu_stok"
on public.lab_pustu_stok for update to authenticated
using (
  public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan')
  and lokasi_id = public.lokasi_saya()
)
with check (lokasi_id = public.lokasi_saya());

drop trigger if exists trg_log_lab_pustu_stok on public.lab_pustu_stok;
create trigger trg_log_lab_pustu_stok
after insert or update or delete on public.lab_pustu_stok
for each row execute function public.catat_log_aktivitas();

-- 5. Realtime: Lab Induk dapat notifikasi laporan Pustu baru tanpa refresh.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lab_pustu_laporan'
  ) then
    alter publication supabase_realtime add table public.lab_pustu_laporan;
  end if;
end $$;

notify pgrst, 'reload schema';
