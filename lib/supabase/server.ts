import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Dipakai di server component / server action. Cookie session ditangani
// otomatis, jadi status login konsisten di server maupun client.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Dipanggil dari Server Component tanpa akses tulis cookie.
            // Aman diabaikan karena middleware yang refresh session.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Sama seperti di atas.
          }
        },
      },
    }
  );
}

// Ambil data pegawai (profil + peran/hak akses) dari user yang sedang login.
// Return null kalau belum login atau baris pegawai belum dibuat admin.
export async function getPegawaiSaya() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: pegawai } = await supabase
    .from("pegawai")
    .select("*")
    .eq("id", user.id)
    .single();

  return pegawai;
}
