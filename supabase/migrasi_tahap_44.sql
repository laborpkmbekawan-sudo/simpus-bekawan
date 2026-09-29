-- =========================================================
-- MIGRASI TAHAP 44 -- MODUL LABORATORIUM (tahap 2, 2 fitur)
--
-- Fitur 3: Tarif & Tagihan Lab otomatis.
--          Tiap pemeriksaan di katalog bisa ditautkan ke tarif_layanan.
--          Saat hasil DIVALIDASI, pemeriksaan bertarif otomatis masuk
--          kunjungan_tindakan -> muncul di halaman Kasir sebagai tindakan
--          tercatat. Aman dipanggil berulang (tidak dobel tagih).
-- Fitur 4: Register & Laporan Lab (rekap periode, waktu tunggu,
--          hasil abnormal). Tidak butuh tabel baru, cuma indeks.
--
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor
-- SETELAH migrasi_tahap_43.sql.
-- =========================================================

-- 1. Tautan pemeriksaan -> tarif. Kosong = pemeriksaan gratis / tidak
--    ditagih (mis. ditanggung program).
alter table public.lab_pemeriksaan
  add column if not exists tarif_layanan_id uuid references public.tarif_layanan (id) on delete set null;

comment on column public.lab_pemeriksaan.tarif_layanan_id is 'Tarif yang ditagihkan ke kasir saat hasil divalidasi (kosong = tidak ditagih)';

-- 2. Penanda item sudah ditagihkan (mencegah tagihan dobel).
alter table public.lab_permintaan_item
  add column if not exists tindakan_id uuid references public.kunjungan_tindakan (id) on delete set null;

comment on column public.lab_permintaan_item.tindakan_id is 'Baris kunjungan_tindakan hasil penagihan otomatis (kosong = belum/tidak ditagih)';

create index if not exists idx_lab_permintaan_item_tindakan on public.lab_permintaan_item (tindakan_id);

-- 3. RPC penagihan. security definer karena peran laboratorium tidak punya
--    izin insert langsung ke kunjungan_tindakan (cuma peran klinis).
--    Hanya Lab/admin, hanya permintaan berstatus 'selesai', hanya item yang
--    tidak dibatalkan, bertarif aktif, dan belum ditagih.
--    Mengembalikan jumlah item yang baru ditagihkan.
create or replace function public.lab_tagihkan_permintaan(p_permintaan_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kunjungan_id uuid;
  v_status text;
  v_item record;
  v_tindakan_id uuid;
  v_jumlah int := 0;
begin
  if public.peran_saya() not in ('admin', 'laboratorium') then
    raise exception 'Cuma Lab/admin yang boleh menagihkan pemeriksaan lab';
  end if;

  select kunjungan_id, status
    into v_kunjungan_id, v_status
  from public.lab_permintaan
  where id = p_permintaan_id
  for update;

  if not found then
    raise exception 'Permintaan lab tidak ditemukan';
  end if;

  if v_status <> 'selesai' then
    raise exception 'Cuma permintaan yang sudah divalidasi yang bisa ditagihkan';
  end if;

  for v_item in
    select i.id, p.tarif_layanan_id
    from public.lab_permintaan_item i
    join public.lab_pemeriksaan p on p.id = i.pemeriksaan_id
    join public.tarif_layanan t on t.id = p.tarif_layanan_id and t.aktif
    where i.permintaan_id = p_permintaan_id
      and i.dibatalkan = false
      and i.tindakan_id is null
    for update of i
  loop
    insert into public.kunjungan_tindakan (kunjungan_id, tarif_layanan_id, dicatat_oleh)
    values (v_kunjungan_id, v_item.tarif_layanan_id, auth.uid())
    returning id into v_tindakan_id;

    update public.lab_permintaan_item
    set tindakan_id = v_tindakan_id
    where id = v_item.id;

    v_jumlah := v_jumlah + 1;
  end loop;

  return v_jumlah;
end;
$$;

revoke all on function public.lab_tagihkan_permintaan(uuid) from public;
grant execute on function public.lab_tagihkan_permintaan(uuid) to authenticated;

-- 4. Indeks untuk laporan periode.
create index if not exists idx_lab_permintaan_diminta_pada on public.lab_permintaan (diminta_pada);
create index if not exists idx_lab_permintaan_divalidasi_pada on public.lab_permintaan (divalidasi_pada);

notify pgrst, 'reload schema';
