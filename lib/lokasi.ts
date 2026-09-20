import { createClient } from "@/lib/supabase/server";

export type LokasiOpsi = { id: string; nama: string; tipe: string };

// Puskesmas Induk + Pustu (tabel lokasi).
export async function ambilSemuaLokasi(): Promise<LokasiOpsi[]> {
  const supabase = createClient();
  const { data } = await supabase.from("lokasi").select("id, nama, tipe").order("urutan", { ascending: true });
  return data ?? [];
}

// "12" -> "00012". Kalau bukan angka murni, dikembalikan apa adanya.
export function normalisasiNoRm(masukan: string) {
  const bersih = masukan.trim();
  return /^\d+$/.test(bersih) ? bersih.padStart(5, "0") : bersih;
}
