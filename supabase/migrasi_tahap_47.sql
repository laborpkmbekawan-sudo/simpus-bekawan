-- =========================================================
-- MIGRASI TAHAP 47 -- MODUL LABORATORIUM (tahap 5)
--
-- Fitur 9:  Penolakan sampel. Lab menolak sampel yang tidak layak
--           (hemolisis, volume kurang, label salah, dst). Permintaan
--           kembali ke "Menunggu Lab", klaster peminta melihat alasannya
--           dan mengirim sampel baru. Hasil draft dari sampel yang
--           ditolak dihapus supaya tidak bocor ke hasil final.
-- Fitur 10: Kontrol mutu (QC) harian. Master bahan kontrol (target + SD),
--           catatan QC harian dengan status otomatis ala Westgard
--           (1-2s peringatan, 1-3s ditolak), grafik Levey-Jennings.
--
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor
-- SETELAH migrasi_tahap_46.sql.
-- =========================================================

-- ---------------------------------------------------------
-- FITUR 9 -- Penolakan sampel
-- ---------------------------------------------------------

alter table public.lab_permintaan
  add column if not exists jumlah_tolak int not null default 0,
  add column if not exists sampel_ditolak_alasan text;

comment on column public.lab_permintaan.jumlah_tolak is 'Berapa kali sampel permintaan ini ditolak Lab';
comment on column public.lab_permintaan.sampel_ditolak_alasan is 'Alasan penolakan terakhir (tampil di klaster peminta)';

create table if not exists public.lab_penolakan_sampel (
  id uuid primary key default gen_random_uuid(),
  permintaan_id uuid not null references public.lab_permintaan (id) on delete cascade,
  alasan text not null,
  catatan text,
  ditolak_oleh uuid references public.pegawai (id),
  ditolak_oleh_nama text,
  ditolak_pada timestamptz not null default now(),
  hasil_draft_dihapus int not null default 0
);

comment on table public.lab_penolakan_sampel is 'Riwayat penolakan sampel lab (dicatat lewat lab_tolak_sampel)';

create index if not exists idx_lab_penolakan_permintaan on public.lab_penolakan_sampel (permintaan_id);
create index if not exists idx_lab_penolakan_pada on public.lab_penolakan_sampel (ditolak_pada);

alter table public.lab_penolakan_sampel enable row level security;

drop policy if exists "semua_pegawai_lihat_lab_penolakan_sampel" on public.lab_penolakan_sampel;
create policy "semua_pegawai_lihat_lab_penolakan_sampel"
on public.lab_penolakan_sampel for select to authenticated using (true);
-- Tidak ada policy insert/update/delete: hanya lewat RPC di bawah.

drop trigger if exists trg_log_lab_penolakan_sampel on public.lab_penolakan_sampel;
create trigger trg_log_lab_penolakan_sampel
after insert or update or delete on public.lab_penolakan_sampel
for each row execute function public.catat_log_aktivitas();

-- RPC atomik: hanya Lab/admin, hanya saat sampel sudah diterima dan hasil
-- belum divalidasi. Mengembalikan jumlah hasil draft yang dihapus.
-- security definer karena peran lab tidak boleh menghapus lab_hasil langsung.
create or replace function public.lab_tolak_sampel(p_permintaan_id uuid, p_alasan text, p_catatan text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_nama text;
  v_hapus int := 0;
  v_alasan text := nullif(btrim(coalesce(p_alasan, '')), '');
  v_catatan text := nullif(btrim(coalesce(p_catatan, '')), '');
begin
  if public.peran_saya() not in ('admin', 'laboratorium') then
    raise exception 'Cuma Lab/admin yang boleh menolak sampel';
  end if;

  if v_alasan is null then
    raise exception 'Alasan penolakan wajib diisi';
  end if;

  select status into v_status
  from public.lab_permintaan
  where id = p_permintaan_id
  for update;

  if not found then
    raise exception 'Permintaan lab tidak ditemukan';
  end if;

  if v_status not in ('sampel_diterima', 'proses') then
    raise exception 'Sampel cuma bisa ditolak setelah diterima dan sebelum hasil divalidasi';
  end if;

  select nama_lengkap into v_nama from public.pegawai where id = auth.uid();

  delete from public.lab_hasil
  where item_id in (select id from public.lab_permintaan_item where permintaan_id = p_permintaan_id);
  get diagnostics v_hapus = row_count;

  insert into public.lab_penolakan_sampel (permintaan_id, alasan, catatan, ditolak_oleh, ditolak_oleh_nama, hasil_draft_dihapus)
  values (p_permintaan_id, v_alasan, v_catatan, auth.uid(), v_nama, v_hapus);

  update public.lab_permintaan
  set status = 'diminta',
      sampel_diterima_oleh = null,
      sampel_diterima_pada = null,
      jumlah_tolak = jumlah_tolak + 1,
      sampel_ditolak_alasan = v_alasan || coalesce(' — ' || v_catatan, '')
  where id = p_permintaan_id;

  return v_hapus;
end;
$$;

revoke all on function public.lab_tolak_sampel(uuid, text, text) from public;
grant execute on function public.lab_tolak_sampel(uuid, text, text) to authenticated;

-- ---------------------------------------------------------
-- FITUR 10 -- Kontrol mutu (QC) harian
-- ---------------------------------------------------------

create table if not exists public.lab_qc_kontrol (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  parameter_id uuid references public.lab_parameter (id) on delete set null,
  level text,
  lot text,
  satuan text,
  target numeric not null,
  sd numeric not null check (sd > 0),
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now()
);

comment on table public.lab_qc_kontrol is 'Bahan kontrol mutu lab (target dan SD dari insert kit/lot)';
comment on column public.lab_qc_kontrol.parameter_id is 'Opsional: parameter yang dijaga QC ini (dipakai untuk peringatan di Input Hasil)';

create index if not exists idx_lab_qc_kontrol_parameter on public.lab_qc_kontrol (parameter_id);

create table if not exists public.lab_qc_hasil (
  id uuid primary key default gen_random_uuid(),
  kontrol_id uuid not null references public.lab_qc_kontrol (id) on delete cascade,
  tanggal date not null,
  nilai numeric not null,
  z numeric,
  status text,
  catatan text,
  dicatat_oleh uuid references public.pegawai (id),
  dicatat_oleh_nama text,
  dicatat_pada timestamptz not null default now()
);

create index if not exists idx_lab_qc_hasil_kontrol on public.lab_qc_hasil (kontrol_id, tanggal desc, dicatat_pada desc);
create index if not exists idx_lab_qc_hasil_tanggal on public.lab_qc_hasil (tanggal);

-- Z-score dan status dihitung di database supaya tidak bisa dipalsukan klien.
create or replace function public.lab_qc_hitung()
returns trigger
language plpgsql
as $$
declare
  v_target numeric;
  v_sd numeric;
  v_z numeric;
begin
  select target, sd into v_target, v_sd from public.lab_qc_kontrol where id = new.kontrol_id;
  if v_sd is null or v_sd <= 0 then
    raise exception 'Bahan kontrol tidak valid';
  end if;
  v_z := round((new.nilai - v_target) / v_sd, 2);
  new.z := v_z;
  new.status := case
    when abs(v_z) > 3 then 'ditolak'
    when abs(v_z) > 2 then 'peringatan'
    else 'dalam_kendali'
  end;
  return new;
end;
$$;

drop trigger if exists trg_lab_qc_hitung on public.lab_qc_hasil;
create trigger trg_lab_qc_hitung
before insert on public.lab_qc_hasil
for each row execute function public.lab_qc_hitung();

alter table public.lab_qc_kontrol enable row level security;
alter table public.lab_qc_hasil enable row level security;

drop policy if exists "semua_pegawai_lihat_lab_qc_kontrol" on public.lab_qc_kontrol;
create policy "semua_pegawai_lihat_lab_qc_kontrol"
on public.lab_qc_kontrol for select to authenticated using (true);

drop policy if exists "lab_kelola_lab_qc_kontrol" on public.lab_qc_kontrol;
create policy "lab_kelola_lab_qc_kontrol"
on public.lab_qc_kontrol for all to authenticated
using (public.peran_saya() in ('admin', 'laboratorium'))
with check (public.peran_saya() in ('admin', 'laboratorium'));

drop policy if exists "semua_pegawai_lihat_lab_qc_hasil" on public.lab_qc_hasil;
create policy "semua_pegawai_lihat_lab_qc_hasil"
on public.lab_qc_hasil for select to authenticated using (true);

-- Catatan QC tidak boleh diubah/dihapus (jejak mutu). Koreksi = catatan baru.
drop policy if exists "lab_catat_lab_qc_hasil" on public.lab_qc_hasil;
create policy "lab_catat_lab_qc_hasil"
on public.lab_qc_hasil for insert to authenticated
with check (public.peran_saya() in ('admin', 'laboratorium'));

drop trigger if exists trg_log_lab_qc_kontrol on public.lab_qc_kontrol;
create trigger trg_log_lab_qc_kontrol
after insert or update or delete on public.lab_qc_kontrol
for each row execute function public.catat_log_aktivitas();

drop trigger if exists trg_log_lab_qc_hasil on public.lab_qc_hasil;
create trigger trg_log_lab_qc_hasil
after insert or update or delete on public.lab_qc_hasil
for each row execute function public.catat_log_aktivitas();

notify pgrst, 'reload schema';
