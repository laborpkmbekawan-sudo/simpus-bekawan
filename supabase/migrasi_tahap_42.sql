-- =========================================================
-- TAHAP 42: MUTASI & PENERIMAAN OBAT (batch/kadaluwarsa)
--           + RESEP OBAT (dokter resepkan -> farmasi verifikasi & serahkan)
--
-- Bagian A: tambah kolom sumber/no_batch/tanggal_kadaluwarsa di
--   mutasi_stok_obat, dipakai form "Mutasi & Penerimaan" (stok masuk
--   resmi dari gudang farmasi/dinkes, beda dari "+Stok masuk" cepat).
--
-- Bagian B: dokter/perawat/bidan resepkan obat pas pelayanan
--   (resep_obat + resep_obat_item), farmasi verifikasi lalu serahkan.
--   Penyerahan motong stok obat otomatis & atomic lewat RPC, sama
--   pola kayak catat_tindakan_kunjungan (tahap 28).
--
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL
-- Editor.
-- =========================================================

-- ---------- BAGIAN A: detail mutasi stok obat ----------
alter table public.mutasi_stok_obat
  add column if not exists sumber text,
  add column if not exists no_batch text,
  add column if not exists tanggal_kadaluwarsa date;

-- ---------- BAGIAN B: resep obat ----------
create table if not exists public.resep_obat (
  id uuid primary key default gen_random_uuid(),
  kunjungan_id uuid not null references public.kunjungan (id) on delete cascade,
  status text not null default 'menunggu'
    check (status in ('menunggu', 'diverifikasi', 'diserahkan', 'dibatalkan')),
  catatan text,
  dicatat_oleh uuid references public.pegawai (id),
  dicatat_pada timestamptz not null default now(),
  diverifikasi_oleh uuid references public.pegawai (id),
  diverifikasi_pada timestamptz,
  diserahkan_oleh uuid references public.pegawai (id),
  diserahkan_pada timestamptz
);

comment on table public.resep_obat is 'Resep obat per kunjungan: dokter resepkan, farmasi verifikasi & serahkan';

create index if not exists idx_resep_obat_kunjungan on public.resep_obat (kunjungan_id);
create index if not exists idx_resep_obat_status on public.resep_obat (status);

alter table public.resep_obat enable row level security;

drop policy if exists "semua_pegawai_lihat_resep_obat" on public.resep_obat;
create policy "semua_pegawai_lihat_resep_obat"
on public.resep_obat for select
to authenticated
using (true);

drop policy if exists "klinis_buat_resep_obat" on public.resep_obat;
create policy "klinis_buat_resep_obat"
on public.resep_obat for insert
to authenticated
with check (public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan'));

drop policy if exists "klinis_farmasi_ubah_resep_obat" on public.resep_obat;
create policy "klinis_farmasi_ubah_resep_obat"
on public.resep_obat for update
to authenticated
using (
  public.peran_saya() in ('admin', 'farmasi', 'dokter', 'dokter_gigi', 'perawat', 'bidan')
)
with check (
  public.peran_saya() in ('admin', 'farmasi', 'dokter', 'dokter_gigi', 'perawat', 'bidan')
);

create table if not exists public.resep_obat_item (
  id uuid primary key default gen_random_uuid(),
  resep_obat_id uuid not null references public.resep_obat (id) on delete cascade,
  obat_id uuid not null references public.obat (id),
  jumlah numeric(12, 2) not null,
  aturan_pakai text,
  catatan text
);

create index if not exists idx_resep_obat_item_resep on public.resep_obat_item (resep_obat_id);

alter table public.resep_obat_item enable row level security;

drop policy if exists "semua_pegawai_lihat_resep_obat_item" on public.resep_obat_item;
create policy "semua_pegawai_lihat_resep_obat_item"
on public.resep_obat_item for select
to authenticated
using (true);

drop policy if exists "klinis_kelola_resep_obat_item" on public.resep_obat_item;
create policy "klinis_kelola_resep_obat_item"
on public.resep_obat_item for all
to authenticated
using (
  public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan')
  and exists (
    select 1 from public.resep_obat r
    where r.id = resep_obat_id and r.status = 'menunggu'
  )
)
with check (
  public.peran_saya() in ('admin', 'dokter', 'dokter_gigi', 'perawat', 'bidan')
  and exists (
    select 1 from public.resep_obat r
    where r.id = resep_obat_id and r.status = 'menunggu'
  )
);

-- RPC: farmasi verifikasi resep (menunggu -> diverifikasi). Cuma
-- ubah status, belum motong stok.
create or replace function public.verifikasi_resep_obat(p_resep_obat_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.peran_saya() not in ('admin', 'farmasi') then
    raise exception 'Cuma farmasi/admin yang boleh verifikasi resep';
  end if;

  update public.resep_obat
  set status = 'diverifikasi', diverifikasi_oleh = auth.uid(), diverifikasi_pada = now()
  where id = p_resep_obat_id and status = 'menunggu';

  if not found then
    raise exception 'Resep tidak ditemukan atau statusnya bukan menunggu';
  end if;
end;
$$;

-- RPC: farmasi serahkan resep (diverifikasi -> diserahkan), motong
-- stok tiap item obat sekaligus, atomic. Kalau ada satu item aja
-- stoknya kurang, SEMUA batal (gak ada yang kepotong tanggung).
create or replace function public.serahkan_resep_obat(p_resep_obat_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_stok numeric;
begin
  if public.peran_saya() not in ('admin', 'farmasi') then
    raise exception 'Cuma farmasi/admin yang boleh menyerahkan resep';
  end if;

  if not exists (select 1 from public.resep_obat where id = p_resep_obat_id and status = 'diverifikasi') then
    raise exception 'Resep harus diverifikasi dulu sebelum diserahkan';
  end if;

  for v_item in
    select obat_id, jumlah from public.resep_obat_item where resep_obat_id = p_resep_obat_id
  loop
    select stok_saat_ini into v_stok from public.obat where id = v_item.obat_id for update;

    if v_stok is null or v_stok < v_item.jumlah then
      raise exception 'Stok obat tidak cukup buat menyerahkan resep ini';
    end if;

    update public.obat set stok_saat_ini = stok_saat_ini - v_item.jumlah where id = v_item.obat_id;

    insert into public.mutasi_stok_obat (obat_id, jenis, jumlah, keterangan, dibuat_oleh)
    values (v_item.obat_id, 'keluar', v_item.jumlah, 'Penyerahan resep obat', auth.uid());
  end loop;

  update public.resep_obat
  set status = 'diserahkan', diserahkan_oleh = auth.uid(), diserahkan_pada = now()
  where id = p_resep_obat_id;
end;
$$;

-- RPC: batalkan resep (belum diserahkan). Klinis boleh batalin punya
-- sendiri sebelum diverifikasi, farmasi/admin boleh kapan aja selama
-- belum diserahkan.
create or replace function public.batalkan_resep_obat(p_resep_obat_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.peran_saya() not in ('admin', 'farmasi', 'dokter', 'dokter_gigi', 'perawat', 'bidan') then
    raise exception 'Gak punya izin membatalkan resep';
  end if;

  update public.resep_obat
  set status = 'dibatalkan'
  where id = p_resep_obat_id and status in ('menunggu', 'diverifikasi');

  if not found then
    raise exception 'Resep tidak ditemukan atau sudah diserahkan/dibatalkan';
  end if;
end;
$$;
-- =========================================================
