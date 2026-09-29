-- =========================================================
-- MIGRASI TAHAP 43 -- MODUL LABORATORIUM (2 fitur pondasi)
--
-- Fitur 1: Katalog Pemeriksaan (paket + parameter + nilai rujukan)
--          dan Permintaan Lab dari klaster -> masuk antrean Lab.
-- Fitur 2: Input Hasil + Validasi di Lab -> hasil kembali ke klaster
--          (notifikasi + tampil di halaman pelayanan + cetak).
--
-- Alur status permintaan:
--   diminta -> sampel_diterima -> proses -> selesai   (atau dibatalkan)
--
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor.
-- =========================================================

create sequence if not exists public.lab_no_seq;

-- 1. Katalog pemeriksaan (bisa berupa pemeriksaan tunggal atau paket
--    yang isinya beberapa parameter, mis. "Darah Rutin").
create table if not exists public.lab_pemeriksaan (
  id uuid primary key default gen_random_uuid(),
  kode text unique,
  nama text not null,
  kategori text not null default 'Lainnya',
  jenis_sampel text,
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now()
);

comment on table public.lab_pemeriksaan is 'Katalog pemeriksaan laboratorium (tunggal/paket)';

alter table public.lab_pemeriksaan enable row level security;

drop policy if exists "semua_pegawai_lihat_lab_pemeriksaan" on public.lab_pemeriksaan;
create policy "semua_pegawai_lihat_lab_pemeriksaan"
on public.lab_pemeriksaan for select to authenticated using (true);

drop policy if exists "lab_kelola_lab_pemeriksaan" on public.lab_pemeriksaan;
create policy "lab_kelola_lab_pemeriksaan"
on public.lab_pemeriksaan for all to authenticated
using (public.peran_saya() in ('admin', 'laboratorium'))
with check (public.peran_saya() in ('admin', 'laboratorium'));

-- 2. Parameter per pemeriksaan + nilai rujukan.
--    tipe 'angka'   : nilai numerik, dibandingkan dengan min/max.
--    tipe 'pilihan' : pilih dari daftar (mis. Negatif/Positif); kalau
--                     pilihan_normal diisi, selain itu ditandai abnormal.
--    tipe 'teks'    : teks bebas (mis. warna urine), tanpa penanda.
--    min_p/max_p kosong = pakai min_l/max_l (nilai rujukan umum).
create table if not exists public.lab_parameter (
  id uuid primary key default gen_random_uuid(),
  pemeriksaan_id uuid not null references public.lab_pemeriksaan (id) on delete cascade,
  nama text not null,
  satuan text,
  tipe text not null default 'angka' check (tipe in ('angka', 'pilihan', 'teks')),
  pilihan text[],
  pilihan_normal text,
  min_l numeric,
  max_l numeric,
  min_p numeric,
  max_p numeric,
  urutan int not null default 0,
  aktif boolean not null default true
);

comment on table public.lab_parameter is 'Parameter hasil per pemeriksaan lab + nilai rujukan';

create index if not exists idx_lab_parameter_pemeriksaan on public.lab_parameter (pemeriksaan_id, urutan);

alter table public.lab_parameter enable row level security;

drop policy if exists "semua_pegawai_lihat_lab_parameter" on public.lab_parameter;
create policy "semua_pegawai_lihat_lab_parameter"
on public.lab_parameter for select to authenticated using (true);

drop policy if exists "lab_kelola_lab_parameter" on public.lab_parameter;
create policy "lab_kelola_lab_parameter"
on public.lab_parameter for all to authenticated
using (public.peran_saya() in ('admin', 'laboratorium'))
with check (public.peran_saya() in ('admin', 'laboratorium'));

-- 3. Header permintaan lab (satu permintaan bisa berisi banyak pemeriksaan).
create table if not exists public.lab_permintaan (
  id uuid primary key default gen_random_uuid(),
  no_lab text unique not null default ('LAB-' || lpad(nextval('public.lab_no_seq')::text, 5, '0')),
  kunjungan_id uuid not null references public.kunjungan (id) on delete cascade,
  status text not null default 'diminta'
    check (status in ('diminta', 'sampel_diterima', 'proses', 'selesai', 'dibatalkan')),
  prioritas text not null default 'rutin' check (prioritas in ('rutin', 'cito')),
  diagnosis_kerja text,
  catatan_klinis text,
  diminta_oleh uuid references public.pegawai (id),
  -- Nama disalin (snapshot) karena RLS pegawai cuma boleh baca profil sendiri;
  -- Lab tetap perlu lihat siapa peminta, dan cetakan hasil perlu nama validator.
  diminta_oleh_nama text,
  diminta_pada timestamptz not null default now(),
  sampel_diterima_oleh uuid references public.pegawai (id),
  sampel_diterima_pada timestamptz,
  divalidasi_oleh uuid references public.pegawai (id),
  divalidasi_oleh_nama text,
  divalidasi_pada timestamptz,
  catatan_validasi text,
  hasil_dilihat_pada timestamptz,
  alasan_batal text,
  diperbarui_pada timestamptz not null default now()
);

comment on table public.lab_permintaan is 'Permintaan pemeriksaan lab dari klaster, dilacak sampai hasil diterima klaster';

create index if not exists idx_lab_permintaan_kunjungan on public.lab_permintaan (kunjungan_id);
create index if not exists idx_lab_permintaan_status on public.lab_permintaan (status, diminta_pada);
create index if not exists idx_lab_permintaan_peminta on public.lab_permintaan (diminta_oleh, status);

drop trigger if exists trg_lab_permintaan_diperbarui on public.lab_permintaan;
create trigger trg_lab_permintaan_diperbarui
before update on public.lab_permintaan
for each row execute function public.set_diperbarui_pada();

alter table public.lab_permintaan enable row level security;

drop policy if exists "semua_pegawai_lihat_lab_permintaan" on public.lab_permintaan;
create policy "semua_pegawai_lihat_lab_permintaan"
on public.lab_permintaan for select to authenticated using (true);

drop policy if exists "klinis_lab_buat_lab_permintaan" on public.lab_permintaan;
create policy "klinis_lab_buat_lab_permintaan"
on public.lab_permintaan for insert to authenticated
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan', 'laboratorium'));

-- Lab/admin ubah status di sepanjang alur. Peminta cuma boleh membatalkan
-- permintaannya sendiri selama belum diterima Lab.
drop policy if exists "lab_ubah_lab_permintaan" on public.lab_permintaan;
create policy "lab_ubah_lab_permintaan"
on public.lab_permintaan for update to authenticated
using (
  public.peran_saya() in ('admin', 'laboratorium')
  or (diminta_oleh = auth.uid() and status = 'diminta')
)
with check (
  public.peran_saya() in ('admin', 'laboratorium')
  or (diminta_oleh = auth.uid() and status = 'dibatalkan')
);

-- 4. Baris pemeriksaan di dalam satu permintaan.
create table if not exists public.lab_permintaan_item (
  id uuid primary key default gen_random_uuid(),
  permintaan_id uuid not null references public.lab_permintaan (id) on delete cascade,
  pemeriksaan_id uuid not null references public.lab_pemeriksaan (id),
  dibatalkan boolean not null default false,
  unique (permintaan_id, pemeriksaan_id)
);

comment on table public.lab_permintaan_item is 'Pemeriksaan yang diminta dalam satu permintaan lab';

create index if not exists idx_lab_permintaan_item_permintaan on public.lab_permintaan_item (permintaan_id);

alter table public.lab_permintaan_item enable row level security;

drop policy if exists "semua_pegawai_lihat_lab_permintaan_item" on public.lab_permintaan_item;
create policy "semua_pegawai_lihat_lab_permintaan_item"
on public.lab_permintaan_item for select to authenticated using (true);

drop policy if exists "klinis_lab_buat_lab_permintaan_item" on public.lab_permintaan_item;
create policy "klinis_lab_buat_lab_permintaan_item"
on public.lab_permintaan_item for insert to authenticated
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan', 'laboratorium'));

drop policy if exists "lab_ubah_lab_permintaan_item" on public.lab_permintaan_item;
create policy "lab_ubah_lab_permintaan_item"
on public.lab_permintaan_item for update to authenticated
using (public.peran_saya() in ('admin', 'laboratorium'))
with check (public.peran_saya() in ('admin', 'laboratorium'));

-- 5. Hasil per parameter. Nama, satuan, dan teks rujukan DISALIN saat hasil
--    disimpan (snapshot), supaya hasil lama tetap benar di cetakan walau
--    katalog diubah belakangan.
create table if not exists public.lab_hasil (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.lab_permintaan_item (id) on delete cascade,
  parameter_id uuid not null references public.lab_parameter (id),
  nama_parameter text not null,
  satuan text,
  rujukan_teks text,
  nilai text not null,
  flag text check (flag in ('normal', 'rendah', 'tinggi', 'abnormal')),
  catatan text,
  dicatat_oleh uuid references public.pegawai (id),
  dicatat_pada timestamptz not null default now(),
  unique (item_id, parameter_id)
);

comment on table public.lab_hasil is 'Hasil pemeriksaan lab per parameter (snapshot nama/satuan/rujukan)';

create index if not exists idx_lab_hasil_item on public.lab_hasil (item_id);

alter table public.lab_hasil enable row level security;

drop policy if exists "semua_pegawai_lihat_lab_hasil" on public.lab_hasil;
create policy "semua_pegawai_lihat_lab_hasil"
on public.lab_hasil for select to authenticated using (true);

drop policy if exists "lab_catat_lab_hasil" on public.lab_hasil;
create policy "lab_catat_lab_hasil"
on public.lab_hasil for insert to authenticated
with check (public.peran_saya() in ('admin', 'laboratorium'));

drop policy if exists "lab_ubah_lab_hasil" on public.lab_hasil;
create policy "lab_ubah_lab_hasil"
on public.lab_hasil for update to authenticated
using (public.peran_saya() in ('admin', 'laboratorium'))
with check (public.peran_saya() in ('admin', 'laboratorium'));

-- 6. Peminta menandai hasil sudah dilihat (mematikan notifikasinya). Lewat
--    fungsi khusus supaya peminta TIDAK perlu izin update penuh ke tabel:
--    cuma kolom hasil_dilihat_pada, cuma permintaannya sendiri, cuma kalau
--    sudah selesai.
create or replace function public.lab_tandai_dilihat(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.lab_permintaan
  set hasil_dilihat_pada = now()
  where id = p_id
    and status = 'selesai'
    and hasil_dilihat_pada is null
    and diminta_oleh = auth.uid();
$$;

revoke all on function public.lab_tandai_dilihat(uuid) from public;
grant execute on function public.lab_tandai_dilihat(uuid) to authenticated;

-- 7. Audit trail otomatis (tampil di Laporan Internal > Log Aktivitas).
drop trigger if exists trg_log_lab_permintaan on public.lab_permintaan;
create trigger trg_log_lab_permintaan
after insert or update or delete on public.lab_permintaan
for each row execute function public.catat_log_aktivitas();

drop trigger if exists trg_log_lab_hasil on public.lab_hasil;
create trigger trg_log_lab_hasil
after insert or update or delete on public.lab_hasil
for each row execute function public.catat_log_aktivitas();

-- 8. Realtime: Lab dapat notifikasi permintaan baru, klaster dapat
--    notifikasi hasil selesai, tanpa refresh.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lab_permintaan'
  ) then
    alter publication supabase_realtime add table public.lab_permintaan;
  end if;
end $$;

-- 9. Data awal katalog. Nilai rujukan = nilai umum dewasa yang lazim dipakai;
--    WAJIB dicek/disesuaikan dengan metode dan alat lab Puskesmas Bekawan
--    lewat menu Katalog Pemeriksaan. Hanya diisi kalau belum ada.
insert into public.lab_pemeriksaan (kode, nama, kategori, jenis_sampel) values
  ('DR',      'Darah Rutin',          'Hematologi',        'Darah EDTA'),
  ('HB',      'Hemoglobin',           'Hematologi',        'Darah EDTA'),
  ('GDS',     'Gula Darah Sewaktu',   'Kimia Klinik',      'Darah kapiler/serum'),
  ('GDP',     'Gula Darah Puasa',     'Kimia Klinik',      'Darah kapiler/serum'),
  ('KOL',     'Kolesterol Total',     'Kimia Klinik',      'Darah kapiler/serum'),
  ('ASURAT',  'Asam Urat',            'Kimia Klinik',      'Darah kapiler/serum'),
  ('UREUM',   'Ureum',                'Kimia Klinik',      'Serum'),
  ('KREAT',   'Kreatinin',            'Kimia Klinik',      'Serum'),
  ('SGOT',    'SGOT (AST)',           'Kimia Klinik',      'Serum'),
  ('SGPT',    'SGPT (ALT)',           'Kimia Klinik',      'Serum'),
  ('URINE',   'Urine Lengkap',        'Urinalisis',        'Urine sewaktu'),
  ('TESPACK', 'Tes Kehamilan (Tes Pack)', 'Urinalisis',    'Urine pagi'),
  ('HBSAG',   'HBsAg',                'Imunoserologi',     'Serum/plasma'),
  ('HIV',     'Anti-HIV (Rapid)',     'Imunoserologi',     'Serum/plasma'),
  ('SIFILIS', 'Sifilis (Rapid)',      'Imunoserologi',     'Serum/plasma'),
  ('MALARIA', 'Malaria (Rapid/Sediaan)', 'Parasitologi',   'Darah kapiler'),
  ('BTA',     'BTA Sputum',           'Mikrobiologi',      'Dahak'),
  ('GOLDAR',  'Golongan Darah',       'Imunohematologi',   'Darah EDTA')
on conflict (kode) do nothing;

insert into public.lab_parameter
  (pemeriksaan_id, nama, satuan, tipe, pilihan, pilihan_normal, min_l, max_l, min_p, max_p, urutan)
select p.id, v.nama, v.satuan, v.tipe, v.pilihan, v.pilihan_normal, v.min_l, v.max_l, v.min_p, v.max_p, v.urutan
from (values
  ('DR',      'Hemoglobin',   'g/dL',    'angka',   null::text[], null::text, 13.0,   17.0,    12.0,   15.0,   1),
  ('DR',      'Leukosit',     '/µL',     'angka',   null::text[], null::text, 4000,   10000,   null,   null,   2),
  ('DR',      'Trombosit',    '/µL',     'angka',   null::text[], null::text, 150000, 400000,  null,   null,   3),
  ('DR',      'Hematokrit',   '%',       'angka',   null::text[], null::text, 40,     50,      36,     46,     4),
  ('DR',      'Eritrosit',    'juta/µL', 'angka',   null::text[], null::text, 4.5,    5.5,     4.0,    5.0,    5),
  ('HB',      'Hemoglobin',   'g/dL',    'angka',   null::text[], null::text, 13.0,   17.0,    12.0,   15.0,   1),
  ('GDS',     'Gula Darah Sewaktu', 'mg/dL', 'angka', null::text[], null::text, null, 200,    null,   null,   1),
  ('GDP',     'Gula Darah Puasa',   'mg/dL', 'angka', null::text[], null::text, 70,   100,    null,   null,   1),
  ('KOL',     'Kolesterol Total',   'mg/dL', 'angka', null::text[], null::text, null, 200,    null,   null,   1),
  ('ASURAT',  'Asam Urat',    'mg/dL',   'angka',   null::text[], null::text, 3.4,    7.0,     2.4,    6.0,    1),
  ('UREUM',   'Ureum',        'mg/dL',   'angka',   null::text[], null::text, 10,     50,      null,   null,   1),
  ('KREAT',   'Kreatinin',    'mg/dL',   'angka',   null::text[], null::text, 0.7,    1.3,     0.6,    1.1,    1),
  ('SGOT',    'SGOT (AST)',   'U/L',     'angka',   null::text[], null::text, null,   40,      null,   null,   1),
  ('SGPT',    'SGPT (ALT)',   'U/L',     'angka',   null::text[], null::text, null,   41,      null,   null,   1),
  ('URINE',   'Warna',        null,      'teks',    null::text[], null::text, null,   null,    null,   null,   1),
  ('URINE',   'Kejernihan',   null,      'teks',    null::text[], null::text, null,   null,    null,   null,   2),
  ('URINE',   'pH',           null,      'angka',   null::text[], null::text, 4.5,    8.0,     null,   null,   3),
  ('URINE',   'Berat Jenis',  null,      'angka',   null::text[], null::text, 1.005,  1.030,   null,   null,   4),
  ('URINE',   'Protein',      null,      'pilihan', array['Negatif','+1','+2','+3','+4'], 'Negatif', null, null, null, null, 5),
  ('URINE',   'Glukosa',      null,      'pilihan', array['Negatif','+1','+2','+3','+4'], 'Negatif', null, null, null, null, 6),
  ('URINE',   'Keton',        null,      'pilihan', array['Negatif','+1','+2','+3'],      'Negatif', null, null, null, null, 7),
  ('URINE',   'Darah/Eritrosit', null,   'pilihan', array['Negatif','+1','+2','+3'],      'Negatif', null, null, null, null, 8),
  ('URINE',   'Leukosit',     null,      'pilihan', array['Negatif','+1','+2','+3'],      'Negatif', null, null, null, null, 9),
  ('TESPACK', 'Hasil',        null,      'pilihan', array['Negatif','Positif'],           null,      null, null, null, null, 1),
  ('HBSAG',   'Hasil',        null,      'pilihan', array['Non-reaktif','Reaktif'],       'Non-reaktif', null, null, null, null, 1),
  ('HIV',     'Hasil',        null,      'pilihan', array['Non-reaktif','Reaktif'],       'Non-reaktif', null, null, null, null, 1),
  ('SIFILIS', 'Hasil',        null,      'pilihan', array['Non-reaktif','Reaktif'],       'Non-reaktif', null, null, null, null, 1),
  ('MALARIA', 'Hasil',        null,      'pilihan', array['Negatif','Positif P. falciparum','Positif P. vivax','Positif Mix'], 'Negatif', null, null, null, null, 1),
  ('BTA',     'Hasil',        null,      'pilihan', array['Negatif','Scanty','+1','+2','+3'], 'Negatif', null, null, null, null, 1),
  ('GOLDAR',  'Golongan Darah', null,    'pilihan', array['A','B','AB','O'],              null,      null, null, null, null, 1),
  ('GOLDAR',  'Rhesus',       null,      'pilihan', array['Positif','Negatif'],           null,      null, null, null, null, 2)
) as v(kode, nama, satuan, tipe, pilihan, pilihan_normal, min_l, max_l, min_p, max_p, urutan)
join public.lab_pemeriksaan p on p.kode = v.kode
where not exists (select 1 from public.lab_parameter x where x.pemeriksaan_id = p.id);

notify pgrst, 'reload schema';
