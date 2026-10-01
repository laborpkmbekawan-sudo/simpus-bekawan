-- =========================================================
-- MIGRASI TAHAP 48 -- MODUL LABORATORIUM (tahap 6)
--
-- Fitur 11: Alat Lab + Kalibrasi & Pemeliharaan.
--           Register alat (merk, no. seri, lokasi, kondisi), interval
--           kalibrasi/pemeliharaan, log tiap kegiatan. Jadwal berikutnya
--           dihitung otomatis di database. Kalibrasi/pemeliharaan GAGAL
--           otomatis menandai alat "perlu perbaikan". Catatan log tidak
--           bisa diubah/dihapus (jejak mutu).
-- Fitur 12: Lot Reagen & Kadaluarsa.
--           Register lot per BHP/reagen (no. lot, kadaluarsa, stabilitas
--           setelah dibuka). Status: tersimpan -> dipakai -> habis/dibuang.
--           Peringatan lot kadaluarsa / segera kadaluarsa di antrean Lab.
--           Tidak mengubah logika stok BHP yang sudah ada.
--
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor
-- SETELAH migrasi_tahap_47.sql.
-- =========================================================

-- ---------------------------------------------------------
-- FITUR 11 -- Alat lab, kalibrasi & pemeliharaan
-- ---------------------------------------------------------

create table if not exists public.lab_alat (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  merk text,
  tipe text,
  no_seri text,
  lokasi text,
  tanggal_pengadaan date,
  kondisi text not null default 'baik'
    check (kondisi in ('baik', 'perlu_perbaikan', 'rusak', 'nonaktif')),
  interval_kalibrasi_hari int check (interval_kalibrasi_hari is null or interval_kalibrasi_hari > 0),
  interval_pemeliharaan_hari int check (interval_pemeliharaan_hari is null or interval_pemeliharaan_hari > 0),
  kalibrasi_terakhir date,
  kalibrasi_berikutnya date,
  pemeliharaan_terakhir date,
  pemeliharaan_berikutnya date,
  catatan text,
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

comment on table public.lab_alat is 'Register alat laboratorium + jadwal kalibrasi/pemeliharaan';

-- Jadwal berikutnya = terakhir + interval. Dihitung di database supaya
-- selalu konsisten (termasuk saat interval diubah belakangan).
create or replace function public.lab_alat_hitung_jadwal()
returns trigger
language plpgsql
as $$
begin
  if new.interval_kalibrasi_hari is null or new.kalibrasi_terakhir is null then
    new.kalibrasi_berikutnya := null;
  else
    new.kalibrasi_berikutnya := new.kalibrasi_terakhir + new.interval_kalibrasi_hari;
  end if;

  if new.interval_pemeliharaan_hari is null or new.pemeliharaan_terakhir is null then
    new.pemeliharaan_berikutnya := null;
  else
    new.pemeliharaan_berikutnya := new.pemeliharaan_terakhir + new.interval_pemeliharaan_hari;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lab_alat_hitung_jadwal on public.lab_alat;
create trigger trg_lab_alat_hitung_jadwal
before insert or update on public.lab_alat
for each row execute function public.lab_alat_hitung_jadwal();

drop trigger if exists trg_lab_alat_diperbarui on public.lab_alat;
create trigger trg_lab_alat_diperbarui
before update on public.lab_alat
for each row execute function public.set_diperbarui_pada();

create table if not exists public.lab_alat_log (
  id uuid primary key default gen_random_uuid(),
  alat_id uuid not null references public.lab_alat (id) on delete cascade,
  jenis text not null check (jenis in ('kalibrasi', 'pemeliharaan', 'perbaikan')),
  tanggal date not null,
  hasil text not null default 'baik' check (hasil in ('baik', 'perlu_tindak_lanjut', 'gagal')),
  pelaksana text,
  no_sertifikat text,
  catatan text,
  dicatat_oleh uuid references public.pegawai (id),
  dicatat_oleh_nama text,
  dicatat_pada timestamptz not null default now()
);

comment on table public.lab_alat_log is 'Log kalibrasi/pemeliharaan/perbaikan alat lab (tidak boleh diubah)';

create index if not exists idx_lab_alat_log_alat on public.lab_alat_log (alat_id, tanggal desc, dicatat_pada desc);

-- Efek log ke alat. Berjalan sebagai definer karena pencatat log tidak
-- harus punya izin ubah tabel alat secara langsung lewat jalur lain.
--  kalibrasi/pemeliharaan baik atau perlu_tindak_lanjut -> tanggal terakhir maju
--  kalibrasi/pemeliharaan gagal -> alat "perlu perbaikan", jadwal TIDAK maju
--  perbaikan baik -> alat "baik" lagi; perbaikan gagal -> alat "rusak"
-- Alat nonaktif tidak pernah diubah kondisinya oleh log.
create or replace function public.lab_alat_log_terapkan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.jenis = 'kalibrasi' then
    if new.hasil = 'gagal' then
      update public.lab_alat set kondisi = 'perlu_perbaikan'
      where id = new.alat_id and kondisi in ('baik', 'perlu_perbaikan');
    else
      update public.lab_alat
      set kalibrasi_terakhir = greatest(coalesce(kalibrasi_terakhir, new.tanggal), new.tanggal)
      where id = new.alat_id;
    end if;
  elsif new.jenis = 'pemeliharaan' then
    if new.hasil = 'gagal' then
      update public.lab_alat set kondisi = 'perlu_perbaikan'
      where id = new.alat_id and kondisi in ('baik', 'perlu_perbaikan');
    else
      update public.lab_alat
      set pemeliharaan_terakhir = greatest(coalesce(pemeliharaan_terakhir, new.tanggal), new.tanggal)
      where id = new.alat_id;
    end if;
  elsif new.jenis = 'perbaikan' then
    if new.hasil = 'baik' then
      update public.lab_alat set kondisi = 'baik'
      where id = new.alat_id and kondisi in ('perlu_perbaikan', 'rusak');
    elsif new.hasil = 'gagal' then
      update public.lab_alat set kondisi = 'rusak'
      where id = new.alat_id and kondisi in ('baik', 'perlu_perbaikan', 'rusak');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lab_alat_log_terapkan on public.lab_alat_log;
create trigger trg_lab_alat_log_terapkan
after insert on public.lab_alat_log
for each row execute function public.lab_alat_log_terapkan();

alter table public.lab_alat enable row level security;
alter table public.lab_alat_log enable row level security;

drop policy if exists "semua_pegawai_lihat_lab_alat" on public.lab_alat;
create policy "semua_pegawai_lihat_lab_alat"
on public.lab_alat for select to authenticated using (true);

drop policy if exists "lab_kelola_lab_alat" on public.lab_alat;
create policy "lab_kelola_lab_alat"
on public.lab_alat for all to authenticated
using (public.peran_saya() in ('admin', 'laboratorium'))
with check (public.peran_saya() in ('admin', 'laboratorium'));

drop policy if exists "semua_pegawai_lihat_lab_alat_log" on public.lab_alat_log;
create policy "semua_pegawai_lihat_lab_alat_log"
on public.lab_alat_log for select to authenticated using (true);

-- Insert saja. Tidak ada policy update/delete: koreksi = catatan baru.
drop policy if exists "lab_catat_lab_alat_log" on public.lab_alat_log;
create policy "lab_catat_lab_alat_log"
on public.lab_alat_log for insert to authenticated
with check (public.peran_saya() in ('admin', 'laboratorium'));

drop trigger if exists trg_log_lab_alat on public.lab_alat;
create trigger trg_log_lab_alat
after insert or update or delete on public.lab_alat
for each row execute function public.catat_log_aktivitas();

drop trigger if exists trg_log_lab_alat_log on public.lab_alat_log;
create trigger trg_log_lab_alat_log
after insert or update or delete on public.lab_alat_log
for each row execute function public.catat_log_aktivitas();

-- ---------------------------------------------------------
-- FITUR 12 -- Lot reagen & kadaluarsa
-- ---------------------------------------------------------

create table if not exists public.lab_reagen_lot (
  id uuid primary key default gen_random_uuid(),
  bhp_id uuid not null references public.bhp (id),
  no_lot text not null,
  tanggal_kadaluarsa date not null,
  tanggal_terima date not null default current_date,
  jumlah_diterima numeric(12, 2) check (jumlah_diterima is null or jumlah_diterima >= 0),
  -- Masa pakai setelah kemasan dibuka (hari). Kosong = ikut kadaluarsa kemasan.
  stabilitas_hari int check (stabilitas_hari is null or stabilitas_hari > 0),
  status text not null default 'tersimpan'
    check (status in ('tersimpan', 'dipakai', 'habis', 'dibuang')),
  tanggal_dibuka date,
  catatan text,
  dicatat_oleh uuid references public.pegawai (id),
  dicatat_oleh_nama text,
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now(),
  unique (bhp_id, no_lot)
);

comment on table public.lab_reagen_lot is 'Register lot reagen/BHP lab + tanggal kadaluarsa (tidak memotong stok, stok tetap di tabel bhp)';

create index if not exists idx_lab_reagen_lot_status on public.lab_reagen_lot (status, tanggal_kadaluarsa);
create index if not exists idx_lab_reagen_lot_bhp on public.lab_reagen_lot (bhp_id);

drop trigger if exists trg_lab_reagen_lot_diperbarui on public.lab_reagen_lot;
create trigger trg_lab_reagen_lot_diperbarui
before update on public.lab_reagen_lot
for each row execute function public.set_diperbarui_pada();

alter table public.lab_reagen_lot enable row level security;

drop policy if exists "semua_pegawai_lihat_lab_reagen_lot" on public.lab_reagen_lot;
create policy "semua_pegawai_lihat_lab_reagen_lot"
on public.lab_reagen_lot for select to authenticated using (true);

drop policy if exists "lab_catat_lab_reagen_lot" on public.lab_reagen_lot;
create policy "lab_catat_lab_reagen_lot"
on public.lab_reagen_lot for insert to authenticated
with check (public.peran_saya() in ('admin', 'laboratorium'));

drop policy if exists "lab_ubah_lab_reagen_lot" on public.lab_reagen_lot;
create policy "lab_ubah_lab_reagen_lot"
on public.lab_reagen_lot for update to authenticated
using (public.peran_saya() in ('admin', 'laboratorium'))
with check (public.peran_saya() in ('admin', 'laboratorium'));

-- Hapus cuma untuk salah input: lot yang belum pernah dibuka.
drop policy if exists "lab_hapus_lab_reagen_lot" on public.lab_reagen_lot;
create policy "lab_hapus_lab_reagen_lot"
on public.lab_reagen_lot for delete to authenticated
using (public.peran_saya() in ('admin', 'laboratorium') and status = 'tersimpan');

drop trigger if exists trg_log_lab_reagen_lot on public.lab_reagen_lot;
create trigger trg_log_lab_reagen_lot
after insert or update or delete on public.lab_reagen_lot
for each row execute function public.catat_log_aktivitas();

notify pgrst, 'reload schema';
