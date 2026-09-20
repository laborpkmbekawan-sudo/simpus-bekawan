-- =========================================================
-- TAHAP 5: RUJUKAN TIDAK LAGI BERGANTUNG PADA DATA PASIEN INDUK
--
-- Pasien Pustu punya No. RM sendiri dan tidak harus terdaftar di
-- Puskesmas Induk. Rujukan sekarang menyimpan salinan identitas pasien
-- (snapshot) di barisnya sendiri, dan pasien_id jadi opsional.
--
-- Data lama aman: rujukan yang sudah ada diisi otomatis dari tabel pasien.
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor.
-- =========================================================

-- 1. pasien_id boleh kosong (pasien Pustu yang belum terdaftar di Induk).
alter table public.rujukan alter column pasien_id drop not null;

-- 2. Kolom salinan identitas pasien.
alter table public.rujukan
  add column if not exists pasien_no_rm_asal text,        -- No. RM di lokasi asal (RM Pustu / RM Induk)
  add column if not exists pasien_nama text,
  add column if not exists pasien_nik text,
  add column if not exists pasien_tanggal_lahir date,
  add column if not exists pasien_jenis_kelamin text,
  add column if not exists pasien_alamat text,
  add column if not exists pasien_jenis_penjamin text,
  add column if not exists pasien_no_bpjs text,
  add column if not exists pasien_alergi text;

-- 3. Isi rujukan lama dari tabel pasien.
update public.rujukan r
set
  pasien_no_rm_asal = p.no_rm,
  pasien_nama = p.nama_lengkap,
  pasien_nik = p.nik,
  pasien_tanggal_lahir = p.tanggal_lahir,
  pasien_jenis_kelamin = p.jenis_kelamin,
  pasien_alamat = nullif(
    concat_ws(
      ', ',
      nullif(p.alamat_jalan, ''),
      case when nullif(p.alamat_rt, '') is not null then 'RT ' || p.alamat_rt end,
      case when nullif(p.alamat_rw, '') is not null then 'RW ' || p.alamat_rw end,
      nullif(p.alamat_desa, ''),
      nullif(p.alamat_kecamatan, ''),
      nullif(p.alamat_kabupaten, '')
    ),
    ''
  ),
  pasien_jenis_penjamin = p.jenis_penjamin,
  pasien_no_bpjs = p.no_bpjs,
  pasien_alergi = p.alergi
from public.pasien p
where r.pasien_id = p.id
  and r.pasien_nama is null;

-- 4. Nama pasien wajib ada di setiap rujukan.
alter table public.rujukan alter column pasien_nama set not null;

alter table public.rujukan drop constraint if exists rujukan_pasien_nama_check;
alter table public.rujukan
  add constraint rujukan_pasien_nama_check check (length(trim(pasien_nama)) > 0);

alter table public.rujukan drop constraint if exists rujukan_pasien_jenis_kelamin_check;
alter table public.rujukan
  add constraint rujukan_pasien_jenis_kelamin_check
  check (pasien_jenis_kelamin is null or pasien_jenis_kelamin in ('L', 'P'));

alter table public.rujukan drop constraint if exists rujukan_pasien_jenis_penjamin_check;
alter table public.rujukan
  add constraint rujukan_pasien_jenis_penjamin_check
  check (pasien_jenis_penjamin is null or pasien_jenis_penjamin in ('bpjs', 'umum'));
-- =========================================================
