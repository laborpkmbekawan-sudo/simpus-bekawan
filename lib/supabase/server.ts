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

// Daftar kode klaster (lihat tabel `klaster`, mis. 'klaster_2', 'klaster_3',
// 'lintas_pendaftaran', 'lintas_farmasi') yang pegawai ini punya akses --
// ini yang jadi PATOKAN UTAMA buat nampilin/nutup menu & halaman, bukan cuma
// peran. Admin selalu dianggap akses semua (gak perlu baris akses_klaster).
export async function getKodeAksesSaya(pegawaiId: string, peran: string): Promise<string[] | "semua"> {
  if (peran === "admin") return "semua";

  const supabase = createClient();
  const { data } = await supabase
    .from("akses_klaster")
    .select("klaster:klaster_id (kode)")
    .eq("pegawai_id", pegawaiId);

  return (data ?? [])
    .map((b) => (b.klaster as unknown as { kode: string } | null)?.kode)
    .filter((k): k is string => !!k);
}

// Helper dipakai di page/action buat gerbang akses per modul. kodeButuh =
// kode klaster (tabel `klaster`) yang jadi syarat, mis. "lintas_pendaftaran".
export function punyaAkses(kodeAkses: string[] | "semua", kodeButuh: string): boolean {
  return kodeAkses === "semua" || kodeAkses.includes(kodeButuh);
}
