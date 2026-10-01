-- =========================================================
-- MIGRASI TAHAP 49 -- MODUL LABORATORIUM (tahap 7)
--
-- Fitur 13: Pemantapan Mutu Eksternal (PME).
--           Register siklus PME dari penyelenggara (mis. BBLK/PNPME):
--           sampel diterima -> hasil lab dilaporkan -> hasil evaluasi
--           penyelenggara masuk. Kuantitatif dinilai SDI
--           ((nilai lab - target) / SD peserta): <=2 memuaskan,
--           2-3 peringatan, >3 tidak memuaskan. Kualitatif: sesuai /
--           tidak sesuai dengan hasil yang benar. Status & penilaian
--           dihitung di database. Tidak memuaskan wajib tindak lanjut.
-- Fitur 14: Ketidaksesuaian & Tindakan Korektif (CAPA).
--           Register kejadian tidak sesuai di lab (pra-analitik,
--           analitik, pasca-analitik, alat, reagen, keselamatan).
--           Alur: terbuka -> ditindaklanjuti -> ditutup. Ditutup hanya
--           kalau penyebab, tindakan korektif, dan verifikasi terisi.
--
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor
-- SETELAH migrasi_tahap_48.sql.
-- =========================================================

-- ---------------------------------------------------------
-- FITUR 13 -- PME
-- ---------------------------------------------------------

create table if not exists public.lab_pme (
  id uuid primary key default gen_random_uuid(),
  penyelenggara text not null,
  program text,
  siklus text not null,
  nama_parameter text not null,
  satuan text,
  jenis text not null default 'kuantitatif' check (jenis in ('kuantitatif', 'kualitatif')),
  tanggal_terima date not null default current_date,
  batas_lapor date,
  tanggal_dilaporkan date,
  -- Kuantitatif
  nilai_lab numeric,
  nilai_target numeric,
  sd_peserta numeric check (sd_peserta is null or sd_peserta > 0),
  sdi numeric,
  -- Kualitatif
  hasil_lab text,
  hasil_benar text,
  -- Hasil evaluasi
  skor numeric,
  evaluasi text check (evaluasi in ('memuaskan', 'peringatan', 'tidak_memuaskan')),
  status text not null default 'diterima' check (status in ('diterima', 'dilaporkan', 'dievaluasi')),
  tindak_lanjut text,
  catatan text,
  dicatat_oleh uuid references public.pegawai (id),
  dicatat_oleh_nama text,
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

comment on table public.lab_pme is 'Siklus pemantapan mutu eksternal lab (SDI/kesesuaian dihitung di DB)';

create index if not exists idx_lab_pme_status on public.lab_pme (status, batas_lapor);
create index if not exists idx_lab_pme_tanggal on public.lab_pme (tanggal_terima desc);

create or replace function public.lab_pme_hitung()
returns trigger
language plpgsql
as $$
begin
  new.sdi := null;
  new.evaluasi := null;

  if new.jenis = 'kuantitatif' then
    if new.nilai_lab is not null and new.nilai_target is not null and new.sd_peserta is not null then
      new.sdi := round((new.nilai_lab - new.nilai_target) / new.sd_peserta, 2);
      new.evaluasi := case
        when abs(new.sdi) > 3 then 'tidak_memuaskan'
        when abs(new.sdi) > 2 then 'peringatan'
        else 'memuaskan'
      end;
    end if;
  else
    if nullif(btrim(coalesce(new.hasil_lab, '')), '') is not null
       and nullif(btrim(coalesce(new.hasil_benar, '')), '') is not null then
      new.evaluasi := case
        when lower(btrim(new.hasil_lab)) = lower(btrim(new.hasil_benar)) then 'memuaskan'
        else 'tidak_memuaskan'
      end;
    end if;
  end if;

  new.status := case
    when new.evaluasi is not null then 'dievaluasi'
    when new.tanggal_dilaporkan is not null then 'dilaporkan'
    else 'diterima'
  end;
  return new;
end;
$$;

drop trigger if exists trg_lab_pme_hitung on public.lab_pme;
create trigger trg_lab_pme_hitung
before insert or update on public.lab_pme
for each row execute function public.lab_pme_hitung();

drop trigger if exists trg_lab_pme_diperbarui on public.lab_pme;
create trigger trg_lab_pme_diperbarui
before update on public.lab_pme
for each row execute function public.set_diperbarui_pada();

alter table public.lab_pme enable row level security;

drop policy if exists "semua_pegawai_lihat_lab_pme" on public.lab_pme;
create policy "semua_pegawai_lihat_lab_pme"
on public.lab_pme for select to authenticated using (true);

drop policy if exists "lab_catat_lab_pme" on public.lab_pme;
create policy "lab_catat_lab_pme"
on public.lab_pme for insert to authenticated
with check (public.peran_saya() in ('admin', 'laboratorium'));

drop policy if exists "lab_ubah_lab_pme" on public.lab_pme;
create policy "lab_ubah_lab_pme"
on public.lab_pme for update to authenticated
using (public.peran_saya() in ('admin', 'laboratorium'))
with check (public.peran_saya() in ('admin', 'laboratorium'));

-- Hapus cuma untuk salah input: siklus yang belum dilaporkan.
drop policy if exists "lab_hapus_lab_pme" on public.lab_pme;
create policy "lab_hapus_lab_pme"
on public.lab_pme for delete to authenticated
using (public.peran_saya() in ('admin', 'laboratorium') and status = 'diterima');

drop trigger if exists trg_log_lab_pme on public.lab_pme;
create trigger trg_log_lab_pme
after insert or update or delete on public.lab_pme
for each row execute function public.catat_log_aktivitas();

-- ---------------------------------------------------------
-- FITUR 14 -- Ketidaksesuaian & tindakan korektif (CAPA)
-- ---------------------------------------------------------

create sequence if not exists public.lab_ks_no_seq;

create table if not exists public.lab_ketidaksesuaian (
  id uuid primary key default gen_random_uuid(),
  no_ks text unique not null default ('KS-' || lpad(nextval('public.lab_ks_no_seq')::text, 4, '0')),
  tanggal date not null default current_date,
  kategori text not null check (
    kategori in ('pra_analitik', 'analitik', 'pasca_analitik', 'alat', 'reagen', 'keselamatan', 'lainnya')
  ),
  sumber text check (sumber in ('qc', 'pme', 'sampel_ditolak', 'alat', 'reagen', 'keluhan', 'temuan_internal', 'lainnya')),
  uraian text not null,
  dampak text not null default 'sedang' check (dampak in ('rendah', 'sedang', 'tinggi')),
  tindakan_segera text,
  penyebab text,
  tindakan_korektif text,
  penanggung_jawab text,
  tenggat date,
  verifikasi text,
  status text not null default 'terbuka' check (status in ('terbuka', 'ditindaklanjuti', 'ditutup')),
  dilaporkan_oleh uuid references public.pegawai (id),
  dilaporkan_oleh_nama text,
  ditutup_oleh_nama text,
  ditutup_pada timestamptz,
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

comment on table public.lab_ketidaksesuaian is 'Register ketidaksesuaian lab + tindakan korektif (CAPA)';

create index if not exists idx_lab_ks_status on public.lab_ketidaksesuaian (status, tenggat);
create index if not exists idx_lab_ks_tanggal on public.lab_ketidaksesuaian (tanggal desc);

-- Penjaga alur: ditutup butuh penyebab + tindakan korektif + verifikasi;
-- laporan yang sudah ditutup tidak bisa dibuka atau diubah lagi.
create or replace function public.lab_ks_jaga()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'ditutup' then
    raise exception 'Ketidaksesuaian yang sudah ditutup tidak bisa diubah. Buat laporan baru kalau terulang.';
  end if;
  if new.status = 'ditutup' then
    if nullif(btrim(coalesce(new.penyebab, '')), '') is null
       or nullif(btrim(coalesce(new.tindakan_korektif, '')), '') is null
       or nullif(btrim(coalesce(new.verifikasi, '')), '') is null then
      raise exception 'Penyebab, tindakan korektif, dan verifikasi wajib diisi sebelum ditutup';
    end if;
    if new.ditutup_pada is null then
      new.ditutup_pada := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lab_ks_jaga on public.lab_ketidaksesuaian;
create trigger trg_lab_ks_jaga
before insert or update on public.lab_ketidaksesuaian
for each row execute function public.lab_ks_jaga();

drop trigger if exists trg_lab_ks_diperbarui on public.lab_ketidaksesuaian;
create trigger trg_lab_ks_diperbarui
before update on public.lab_ketidaksesuaian
for each row execute function public.set_diperbarui_pada();

alter table public.lab_ketidaksesuaian enable row level security;

drop policy if exists "semua_pegawai_lihat_lab_ks" on public.lab_ketidaksesuaian;
create policy "semua_pegawai_lihat_lab_ks"
on public.lab_ketidaksesuaian for select to authenticated using (true);

drop policy if exists "lab_catat_lab_ks" on public.lab_ketidaksesuaian;
create policy "lab_catat_lab_ks"
on public.lab_ketidaksesuaian for insert to authenticated
with check (public.peran_saya() in ('admin', 'laboratorium'));

drop policy if exists "lab_ubah_lab_ks" on public.lab_ketidaksesuaian;
create policy "lab_ubah_lab_ks"
on public.lab_ketidaksesuaian for update to authenticated
using (public.peran_saya() in ('admin', 'laboratorium'))
with check (public.peran_saya() in ('admin', 'laboratorium'));

-- Tidak ada policy delete: jejak mutu tidak dihapus.

drop trigger if exists trg_log_lab_ks on public.lab_ketidaksesuaian;
create trigger trg_log_lab_ks
after insert or update or delete on public.lab_ketidaksesuaian
for each row execute function public.catat_log_aktivitas();

notify pgrst, 'reload schema';
