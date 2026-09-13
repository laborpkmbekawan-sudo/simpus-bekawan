"use server";

import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function daftarKunjunganAction(
  _sebelum: { pesan: string; sukses: boolean; nomorAntrian?: number; namaKlaster?: string } | null,
  formData: FormData
): Promise<{ pesan: string; sukses: boolean; nomorAntrian?: number; namaKlaster?: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) {
    return { pesan: "Sesi login gak ditemukan, coba masuk ulang.", sukses: false };
  }

  const pasienId = String(formData.get("pasien_id") ?? "");
  const klasterTujuanId = String(formData.get("klaster_tujuan_id") ?? "");
  const jenisKunjungan = String(formData.get("jenis_kunjungan") ?? "");

  if (!pasienId || !klasterTujuanId || !jenisKunjungan) {
    return { pesan: "Semua field wajib diisi.", sukses: false };
  }

  const supabase = createClient();
  const hariIni = new Date().toISOString().slice(0, 10);

  // Hitung nomor antrian: jumlah kunjungan hari ini ke klaster yang sama + 1.
  // Direset otomatis tiap hari karena filter tanggal = hari ini.
  const { count } = await supabase
    .from("kunjungan")
    .select("id", { count: "exact", head: true })
    .eq("klaster_tujuan_id", klasterTujuanId)
    .eq("tanggal", hariIni);

  const nomorAntrian = (count ?? 0) + 1;

  const { data: klaster } = await supabase
    .from("klaster")
    .select("nama")
    .eq("id", klasterTujuanId)
    .single();

  const { error } = await supabase.from("kunjungan").insert({
    pasien_id: pasienId,
    klaster_tujuan_id: klasterTujuanId,
    jenis_kunjungan: jenisKunjungan,
    nomor_antrian: nomorAntrian,
    tanggal: hariIni,
    dibuat_oleh: pemanggil.id,
  });

  if (error) {
    return { pesan: `Gagal mendaftarkan kunjungan: ${error.message}`, sukses: false };
  }

  revalidatePath("/dashboard/pasien");

  return {
    pesan: "Kunjungan berhasil didaftarkan.",
    sukses: true,
    nomorAntrian,
    namaKlaster: klaster?.nama ?? "",
  };
}
