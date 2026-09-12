import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// PENTING: file ini pakai SERVICE ROLE KEY, yang tembus semua RLS policy.
// Import "server-only" bikin build gagal kalau file ini kebawa ke bundle
// client secara tidak sengaja. Jangan pernah kirim service role key ke
// browser atau expose lewat NEXT_PUBLIC_*.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
