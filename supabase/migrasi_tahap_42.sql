-- =========================================================
-- MIGRASI TAHAP 42 -- MODUL APOTEK (2 fitur lanjutan)
-- 1. Racikan Obat (mis. puyer anak: campuran beberapa obat jadi N bungkus)
-- 2. Stok Opname (hitung fisik vs sistem, otomatis catat penyesuaian)
-- =========================================================

-- 1a. Header racikan, nempel ke satu resep (1 resep bisa punya beberapa
--     racikan berbeda, mis. puyer batuk + puyer demam).
create table public.resep_racikan (
  id uuid primary key default gen_random_uuid(),
  resep_obat_id uuid not null references public.resep_obat (id) on delete cascade,
  nama_racikan text not null,        -- contoh: "Puyer Batuk Pilek"
  jumlah_bungkus int not null,
  waktu_pemberian text,
  durasi_hari int,
  catatan text,
  dibuat_pada timestamptz not null default now()
);

comment on table public.resep_racikan is 'Racikan/puyer: campuran beberapa obat digabung jadi N bungkus per resep';

create index idx_resep_racikan_resep on public.resep_racikan (resep_obat_id);

alter table public.resep_racikan enable row level security;

create policy "semua_pegawai_lihat_resep_racikan"
on public.resep_racikan for select to authenticated using (true);

create policy "peran_klinis_farmasi_catat_resep_racikan"
on public.resep_racikan for insert to authenticated
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan', 'farmasi'));

-- 1b. Komposisi tiap racikan -- jumlah_total = total obat dasar yang
--     kepake buat SEMUA bungkus racikan itu (bukan per bungkus), biar
--     satuannya langsung nyambung ke satuan stok obat pas dipotong.
create table public.resep_racikan_komposisi (
  id uuid primary key default gen_random_uuid(),
  resep_racikan_id uuid not null references public.resep_racikan (id) on delete cascade,
  obat_id uuid not null references public.obat (id),
  jumlah_total numeric(12, 2) not null,
  dibatalkan boolean not null default false
);

comment on table public.resep_racikan_komposisi is 'Daftar obat dasar + jumlah yang dicampur dalam satu racikan';

create index idx_resep_racikan_komposisi_racikan on public.resep_racikan_komposisi (resep_racikan_id);

alter table public.resep_racikan_komposisi enable row level security;

create policy "semua_pegawai_lihat_resep_racikan_komposisi"
on public.resep_racikan_komposisi for select to authenticated using (true);

create policy "peran_klinis_farmasi_catat_resep_racikan_komposisi"
on public.resep_racikan_komposisi for insert to authenticated
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan', 'farmasi'));

create policy "farmasi_batalkan_resep_racikan_komposisi"
on public.resep_racikan_komposisi for update to authenticated
using (public.peran_saya() in ('admin', 'farmasi'))
with check (public.peran_saya() in ('admin', 'farmasi'));

-- 2a. Header sesi stok opname (satu sesi = satu kali hitung fisik, bisa
--     nyakup banyak obat sekaligus).
create table public.stok_opname (
  id uuid primary key default gen_random_uuid(),
  catatan text,
  dibuat_oleh uuid references public.pegawai (id),
  dibuat_pada timestamptz not null default now()
);

comment on table public.stok_opname is 'Sesi hitung fisik stok obat -- header';

alter table public.stok_opname enable row level security;

create policy "semua_pegawai_lihat_stok_opname"
on public.stok_opname for select to authenticated using (true);

create policy "farmasi_catat_stok_opname"
on public.stok_opname for insert to authenticated
with check (public.peran_saya() in ('admin', 'farmasi'));

-- 2b. Baris per obat dalam satu sesi opname -- stok_sistem direkam SAAT
--     opname dibuat (bukan dihitung ulang belakangan), biar selisihnya
--     akurat dibanding histori mutasi walau stok sistem berubah lagi
--     setelahnya.
create table public.stok_opname_item (
  id uuid primary key default gen_random_uuid(),
  stok_opname_id uuid not null references public.stok_opname (id) on delete cascade,
  obat_id uuid not null references public.obat (id),
  stok_sistem numeric(12, 2) not null,
  stok_fisik numeric(12, 2) not null,
  selisih numeric(12, 2) not null
);

comment on table public.stok_opname_item is 'Baris per obat: stok sistem vs stok fisik hasil hitung';

create index idx_stok_opname_item_opname on public.stok_opname_item (stok_opname_id);

alter table public.stok_opname_item enable row level security;

create policy "semua_pegawai_lihat_stok_opname_item"
on public.stok_opname_item for select to authenticated using (true);

create policy "farmasi_catat_stok_opname_item"
on public.stok_opname_item for insert to authenticated
with check (public.peran_saya() in ('admin', 'farmasi'));

notify pgrst, 'reload schema';
