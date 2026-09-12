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
