-- =========================================================
-- TAHAP 9: (A) Perbaikan enum peran yang belum lengkap
--          (B) Kebijakan kelola Klaster (khusus admin)
--          (C) Log Aktivitas -- audit trail 5 tabel penting
--
-- Jalankan SEKALI di Supabase SQL Editor. Tidak ada data yang dihapus.
-- =========================================================

-- ---------- A. Enum peran_akses belum punya sebagian peran ----------
-- Kode aplikasi (form tambah/edit pegawai, RPC catat_tindakan_kunjungan, dll)
-- sudah pakai 'dokter_gigi', 'manajemen', 'tenaga_gizi', 'kesling', 'promkes'
-- -- tapi label itu belum pernah didaftarkan ke tipe enum peran_akses.
-- Akibatnya dua hal:
--  1. Tombol Catat Tindakan gagal total buat SEMUA peran (bukan cuma dokter
--     gigi): RPC-nya bandingin peran_saya() ke daftar berisi literal
--     'dokter_gigi', dan Postgres coba cast SEMUA literal di daftar itu ke
--     enum peran_akses dulu sebelum sempat cek yang cocok. Karena labelnya
--     belum terdaftar, castingnya gagal duluan.
--  2. Assign pegawai baru ke salah satu 5 peran itu (lewat menu Data
--     Pegawai) bakal gagal disimpan -- kolom peran tipenya enum ini juga.
alter type public.peran_akses add value if not exists 'dokter_gigi';
alter type public.peran_akses add value if not exists 'manajemen';
alter type public.peran_akses add value if not exists 'tenaga_gizi';
alter type public.peran_akses add value if not exists 'kesling';
alter type public.peran_akses add value if not exists 'promkes';

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
