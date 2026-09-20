-- =========================================================
-- TAHAP 4: NOTIFIKASI RUJUKAN MASUK (Supabase Realtime)
--
-- Aplikasi mendengarkan perubahan tabel rujukan lewat Realtime supaya
-- petugas di lokasi tujuan langsung dapat notifikasi. Realtime cuma jalan
-- kalau tabelnya masuk publication `supabase_realtime`.
--
-- Aman dijalankan berulang kali. Tidak mengubah/menghapus data.
-- Jalankan SEKALI di Supabase SQL Editor.
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rujukan'
  ) then
    alter publication supabase_realtime add table public.rujukan;
  end if;
end $$;
