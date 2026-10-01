-- =========================================================
-- MIGRASI TAHAP 45 -- MODUL LABORATORIUM (tahap 3)
--
-- Fitur 5: Reagen & BHP Lab.
--          Tiap pemeriksaan katalog punya resep BHP/reagen (jumlah per
--          pemeriksaan). Saat hasil DIVALIDASI, stok BHP otomatis
--          terpotong dan tercatat di mutasi_stok_bhp (muncul di
--          Farmasi > BHP dan Laporan Lab). Tidak bisa potong dobel.
-- Fitur 6: Riwayat & Tren Hasil Pasien -- cuma baca data, tidak butuh
--          tabel baru.
--
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor
-- SETELAH migrasi_tahap_44.sql.
-- =========================================================

-- 1. Resep BHP/reagen per pemeriksaan.
create table if not exists public.lab_resep_bhp (
  id uuid primary key default gen_random_uuid(),
  pemeriksaan_id uuid not null references public.lab_pemeriksaan (id) on delete cascade,
  bhp_id uuid not null references public.bhp (id) on delete cascade,
  jumlah_default numeric(12, 2) not null default 1 check (jumlah_default > 0),
  unique (pemeriksaan_id, bhp_id)
);

comment on table public.lab_resep_bhp is 'BHP/reagen yang terpakai per satu pemeriksaan lab (dipotong otomatis saat hasil divalidasi)';

create index if not exists idx_lab_resep_bhp_pemeriksaan on public.lab_resep_bhp (pemeriksaan_id);

alter table public.lab_resep_bhp enable row level security;

drop policy if exists "semua_pegawai_lihat_lab_resep_bhp" on public.lab_resep_bhp;
create policy "semua_pegawai_lihat_lab_resep_bhp"
on public.lab_resep_bhp for select to authenticated using (true);

drop policy if exists "lab_farmasi_kelola_lab_resep_bhp" on public.lab_resep_bhp;
create policy "lab_farmasi_kelola_lab_resep_bhp"
on public.lab_resep_bhp for all to authenticated
using (public.peran_saya() in ('admin', 'laboratorium', 'farmasi'))
with check (public.peran_saya() in ('admin', 'laboratorium', 'farmasi'));

drop trigger if exists trg_log_lab_resep_bhp on public.lab_resep_bhp;
create trigger trg_log_lab_resep_bhp
after insert or update or delete on public.lab_resep_bhp
for each row execute function public.catat_log_aktivitas();

-- 2. Penanda item sudah dipotong stoknya (mencegah potong dobel).
alter table public.lab_permintaan_item
  add column if not exists bhp_dipotong_pada timestamptz;

comment on column public.lab_permintaan_item.bhp_dipotong_pada is 'Waktu stok BHP item ini dipotong (kosong = belum diproses)';

-- 3. RPC potong stok. security definer karena peran laboratorium tidak
--    punya izin update bhp / insert mutasi_stok_bhp secara langsung.
--    Hanya Lab/admin, hanya permintaan 'selesai', hanya item yang tidak
--    dibatalkan dan belum diproses. Stok boleh jadi minus (sama seperti
--    tindakan di kasir) supaya validasi hasil tidak pernah tertahan;
--    BHP yang jadi minus dikembalikan di daftar "kurang".
--    Return: {"pemeriksaan": <jumlah item yang punya resep>, "kurang": [nama BHP, ...]}
create or replace function public.lab_potong_bhp_permintaan(p_permintaan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_no_lab text;
  v_item record;
  v_resep record;
  v_stok numeric;
  v_diproses int := 0;
  v_kurang text[] := '{}';
begin
  if public.peran_saya() not in ('admin', 'laboratorium') then
    raise exception 'Cuma Lab/admin yang boleh memotong stok BHP lab';
  end if;

  select status, no_lab
    into v_status, v_no_lab
  from public.lab_permintaan
  where id = p_permintaan_id
  for update;

  if not found then
    raise exception 'Permintaan lab tidak ditemukan';
  end if;

  if v_status <> 'selesai' then
    raise exception 'Cuma permintaan yang sudah divalidasi yang bisa memotong stok';
  end if;

  for v_item in
    select i.id, i.pemeriksaan_id, p.nama as nama_pemeriksaan
    from public.lab_permintaan_item i
    join public.lab_pemeriksaan p on p.id = i.pemeriksaan_id
    where i.permintaan_id = p_permintaan_id
      and i.dibatalkan = false
      and i.bhp_dipotong_pada is null
    for update of i
  loop
    for v_resep in
      select r.bhp_id, r.jumlah_default, b.nama_bhp
      from public.lab_resep_bhp r
      join public.bhp b on b.id = r.bhp_id
      where r.pemeriksaan_id = v_item.pemeriksaan_id
    loop
      update public.bhp
      set stok_saat_ini = stok_saat_ini - v_resep.jumlah_default
      where id = v_resep.bhp_id
      returning stok_saat_ini into v_stok;

      insert into public.mutasi_stok_bhp (bhp_id, jenis, jumlah, keterangan, dibuat_oleh)
      values (
        v_resep.bhp_id,
        'keluar',
        v_resep.jumlah_default,
        'Lab ' || v_no_lab || ' · ' || v_item.nama_pemeriksaan,
        auth.uid()
      );

      if v_stok < 0 and not (v_resep.nama_bhp = any (v_kurang)) then
        v_kurang := array_append(v_kurang, v_resep.nama_bhp);
      end if;

      v_diproses := v_diproses + 1;
    end loop;

    update public.lab_permintaan_item
    set bhp_dipotong_pada = now()
    where id = v_item.id;
  end loop;

  return jsonb_build_object('pemakaian', v_diproses, 'kurang', to_jsonb(v_kurang));
end;
$$;

revoke all on function public.lab_potong_bhp_permintaan(uuid) from public;
grant execute on function public.lab_potong_bhp_permintaan(uuid) to authenticated;

notify pgrst, 'reload schema';
