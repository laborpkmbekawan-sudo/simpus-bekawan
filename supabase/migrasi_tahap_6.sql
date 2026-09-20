-- =========================================================
-- TAHAP 6: KONDISI KLINIS DI SURAT RUJUKAN
--
-- Rujukan (terutama ke IGD rumah sakit) harus memuat keluhan, tanda vital,
-- pemeriksaan, dan terapi yang sudah diberikan. Semua disimpan di baris
-- rujukan itu sendiri, jadi pasien Pustu yang tidak ada di data Induk tetap
-- bisa dirujuk lengkap.
--
-- Rujukan lama tidak diubah (kolom baru kosong; surat cetak lama tetap
-- membaca skrining kunjungan seperti sebelumnya).
-- Aman dijalankan berulang kali. Jalankan SEKALI di Supabase SQL Editor.
-- =========================================================

alter table public.rujukan
  add column if not exists keluhan_utama text,
  add column if not exists td_sistolik int,
  add column if not exists td_diastolik int,
  add column if not exists nadi int,
  add column if not exists frekuensi_napas int,
  add column if not exists suhu numeric(4, 1),
  add column if not exists spo2 int,
  add column if not exists gcs int,
  add column if not exists berat_badan numeric(5, 1),
  add column if not exists pemeriksaan_fisik text,
  add column if not exists pemeriksaan_penunjang text,
  add column if not exists terapi_diberikan text;

-- Batas wajar supaya salah ketik (mis. suhu 366) ditolak database.
alter table public.rujukan drop constraint if exists rujukan_ttv_check;
alter table public.rujukan
  add constraint rujukan_ttv_check check (
    (td_sistolik is null or td_sistolik between 40 and 300)
    and (td_diastolik is null or td_diastolik between 20 and 200)
    and (nadi is null or nadi between 20 and 250)
    and (frekuensi_napas is null or frekuensi_napas between 5 and 80)
    and (suhu is null or suhu between 30 and 45)
    and (spo2 is null or spo2 between 50 and 100)
    and (gcs is null or gcs between 3 and 15)
    and (berat_badan is null or berat_badan between 0.5 and 400)
  );
-- =========================================================
