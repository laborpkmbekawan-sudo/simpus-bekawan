-- =========================================================
-- MIGRASI TAHAP 41 -- MODUL APOTEK (tahap 1 dari 2-3 fitur pondasi)
-- 1. Master Data Obat (stok + stok minimum)
-- 2. Mutasi & Penerimaan (log tiap perubahan stok obat)
-- 3. Entri Resep Manual + Verifikasi & Penyerahan Resep
--
-- Kartu Stok Digital sengaja gak dibikin tabel terpisah -- itu tinggal query
-- gabungan mutasi_stok_obat per obat_id, urut tanggal. Stok Opname/LPLPO/
-- Laporan nyusul tahap berikutnya begitu data transaksi ini udah jalan.
-- =========================================================

-- 1. Master data obat + stok berjalan. Pola persis kayak public.bhp yang
--    udah ada, biar konsisten sama modul Farmasi (BHP) yang existing.
create table public.obat (
  id uuid primary key default gen_random_uuid(),
  nama_obat text not null,
  kategori text,                        -- contoh: Antibiotik, Analgesik, Antihipertensi
  bentuk_sediaan text,                  -- contoh: Tablet, Sirup, Kapsul, Salep
  satuan text not null default 'tablet',
  stok_saat_ini numeric(12, 2) not null default 0,
  stok_minimum numeric(12, 2) not null default 0,
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now()
);

comment on table public.obat is 'Master data obat apotek dan stok berjalan';

alter table public.obat enable row level security;

create policy "semua_pegawai_lihat_obat"
on public.obat for select
to authenticated
using (true);

create policy "farmasi_kelola_obat"
on public.obat for all
to authenticated
using (public.peran_saya() in ('admin', 'farmasi'))
with check (public.peran_saya() in ('admin', 'farmasi'));

-- 2. Riwayat mutasi stok obat -- setiap kali stok berubah (masuk dari
--    penerimaan, keluar dari penyerahan resep, atau penyesuaian manual),
--    tercatat di sini. Ini juga yang jadi sumber data Kartu Stok Digital.
create table public.mutasi_stok_obat (
  id uuid primary key default gen_random_uuid(),
  obat_id uuid not null references public.obat (id) on delete cascade,
  jenis text not null check (jenis in ('masuk', 'keluar', 'penyesuaian')),
  jumlah numeric(12, 2) not null,
  keterangan text,
  dibuat_oleh uuid references public.pegawai (id),
  dibuat_pada timestamptz not null default now()
);

comment on table public.mutasi_stok_obat is 'Log tiap perubahan stok obat -- sumber Kartu Stok Digital & LPLPO nanti';

create index idx_mutasi_stok_obat_obat on public.mutasi_stok_obat (obat_id, dibuat_pada desc);

alter table public.mutasi_stok_obat enable row level security;

create policy "semua_pegawai_lihat_mutasi_obat"
on public.mutasi_stok_obat for select
to authenticated
using (true);

create policy "farmasi_catat_mutasi_obat"
on public.mutasi_stok_obat for insert
to authenticated
with check (public.peran_saya() in ('admin', 'farmasi'));

-- 3. Resep obat per kunjungan (header). Sementara diisi manual lewat
--    "Entri Resep Manual" di modul Farmasi -- integrasi otomatis dari
--    halaman Pelayanan dokter nyusul pas modul itu dirombak.
create table public.resep_obat (
  id uuid primary key default gen_random_uuid(),
  kunjungan_id uuid not null references public.kunjungan (id) on delete cascade,
  status text not null default 'menunggu'
    check (status in ('menunggu', 'diracik', 'selesai', 'dibatalkan')),
  catatan text,
  dibuat_oleh uuid references public.pegawai (id),
  dibuat_pada timestamptz not null default now(),
  diserahkan_oleh uuid references public.pegawai (id),
  diserahkan_pada timestamptz
);

comment on table public.resep_obat is 'Header resep obat per kunjungan -- 1 kunjungan bisa lebih dari 1 resep';

create index idx_resep_obat_kunjungan on public.resep_obat (kunjungan_id);
create index idx_resep_obat_status on public.resep_obat (status) where status <> 'selesai';

alter table public.resep_obat enable row level security;

create policy "semua_pegawai_lihat_resep_obat"
on public.resep_obat for select
to authenticated
using (true);

-- Peran klinis bikin resep dari pelayanan (nanti), farmasi/admin bikin
-- lewat Entri Resep Manual -- dua-duanya lewat jalur yang sama.
create policy "peran_klinis_farmasi_catat_resep_obat"
on public.resep_obat for insert
to authenticated
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan', 'farmasi'));

-- Ubah status (verifikasi/serah/batal) cuma farmasi/admin.
create policy "farmasi_ubah_resep_obat"
on public.resep_obat for update
to authenticated
using (public.peran_saya() in ('admin', 'farmasi'))
with check (public.peran_saya() in ('admin', 'farmasi'));

-- 4. Baris obat per resep -- dosis, aturan pakai, jumlah lengkap biar
--    langsung kebaca jelas sama petugas farmasi pas nyiapin/nyerahin.
create table public.resep_obat_item (
  id uuid primary key default gen_random_uuid(),
  resep_obat_id uuid not null references public.resep_obat (id) on delete cascade,
  obat_id uuid not null references public.obat (id),
  dosis text,                      -- contoh: "500 mg", "1 sendok takar"
  frekuensi_per_hari int,          -- contoh: 3 (buat "3x sehari")
  waktu_pemberian text,            -- contoh: "Sebelum makan", "Sesudah makan"
  durasi_hari int,
  jumlah numeric(12, 2) not null,  -- total yang diserahkan (tablet/botol/dst)
  catatan text,
  dibatalkan boolean not null default false,
  dibuat_pada timestamptz not null default now()
);

comment on table public.resep_obat_item is 'Detail per obat dalam satu resep: dosis, aturan pakai, jumlah';

create index idx_resep_obat_item_resep on public.resep_obat_item (resep_obat_id);

alter table public.resep_obat_item enable row level security;

create policy "semua_pegawai_lihat_resep_obat_item"
on public.resep_obat_item for select
to authenticated
using (true);

create policy "peran_klinis_farmasi_catat_resep_obat_item"
on public.resep_obat_item for insert
to authenticated
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan', 'farmasi'));

-- Farmasi boleh batalin 1 baris obat (misal stok abis pas racik) tanpa
-- ubah baris lain / hapus histori.
create policy "farmasi_batalkan_resep_obat_item"
on public.resep_obat_item for update
to authenticated
using (public.peran_saya() in ('admin', 'farmasi'))
with check (public.peran_saya() in ('admin', 'farmasi'));
