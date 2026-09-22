-- =========================================================
-- TAHAP 8: (A) WAKTU TUNGGU KUNJUNGAN
--          (B) SURVEI KEPUASAN PASIEN
--
-- Jalankan SEKALI di Supabase SQL Editor. Tidak ada data yang dihapus.
-- =========================================================

-- ---------- A. Jam dipanggil & selesai, buat hitung rata-rata waktu tunggu ----------
-- Diisi otomatis oleh trigger setiap kali status kunjungan berubah, jadi
-- kode aplikasi yang sudah ada (halaman Antrian, Pelayanan) tidak perlu diubah.
alter table public.kunjungan
  add column if not exists dipanggil_pada timestamptz,
  add column if not exists selesai_pada timestamptz;

create or replace function public.catat_waktu_status_kunjungan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'dipanggil' and old.status is distinct from 'dipanggil' and new.dipanggil_pada is null then
    new.dipanggil_pada := now();
  end if;
  if new.status = 'selesai' and old.status is distinct from 'selesai' and new.selesai_pada is null then
    new.selesai_pada := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_catat_waktu_status_kunjungan on public.kunjungan;
create trigger trg_catat_waktu_status_kunjungan
before update on public.kunjungan
for each row
execute function public.catat_waktu_status_kunjungan();

-- ---------- B. Survei kepuasan pasien ----------
-- Diisi pasien sendiri lewat halaman publik /survei (tanpa login), jadi
-- insert dibuka untuk peran anon. Hanya admin & kapus yang boleh membaca
-- hasilnya (lewat halaman Laporan Kepuasan).
create table if not exists public.survei_kepuasan (
  id uuid primary key default gen_random_uuid(),
  klaster_id uuid references public.klaster (id) on delete set null,
  nama_pasien text,
  no_rm text,
  nilai text not null check (nilai in ('sangat_puas', 'puas', 'cukup', 'kurang_puas')),
  saran text,
  dibuat_pada timestamptz not null default now()
);

comment on table public.survei_kepuasan is 'Survei kepuasan pasien, diisi mandiri lewat halaman publik /survei';

alter table public.survei_kepuasan enable row level security;

drop policy if exists "siapa_saja_isi_survei" on public.survei_kepuasan;
create policy "siapa_saja_isi_survei"
on public.survei_kepuasan for insert
to anon, authenticated
with check (
  nilai in ('sangat_puas', 'puas', 'cukup', 'kurang_puas')
  and (saran is null or length(saran) <= 2000)
  and (nama_pasien is null or length(nama_pasien) <= 200)
  and (no_rm is null or length(no_rm) <= 30)
);

drop policy if exists "admin_kapus_baca_survei" on public.survei_kepuasan;
create policy "admin_kapus_baca_survei"
on public.survei_kepuasan for select
to authenticated
using (public.peran_saya() in ('admin', 'kapus'));

drop policy if exists "siapa_saja_baca_klaster_untuk_survei" on public.klaster;
create policy "siapa_saja_baca_klaster_untuk_survei"
on public.klaster for select
to anon
using (true);
create index if not exists idx_survei_kepuasan_dibuat_pada on public.survei_kepuasan (dibuat_pada);
-- =========================================================
