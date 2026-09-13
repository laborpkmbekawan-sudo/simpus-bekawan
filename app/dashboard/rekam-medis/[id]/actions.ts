"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

const PERAN_KLINIS = ["admin", "dokter", "dokter_gigi", "perawat", "bidan"];

export async function simpanCatatanKlinisAction(
  _sebelum: { pesan: string; sukses: boolean } | null,
  formData: FormData
): Promise<{ pesan: string; sukses: boolean }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KLINIS.includes(pemanggil.peran)) {
    return { pesan: "Cuma tenaga klinis (dokter/perawat/bidan) yang boleh isi catatan ini.", sukses: false };
  }

  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const pasienId = String(formData.get("pasien_id") ?? "");
  const diagnosis = String(formData.get("diagnosis") ?? "").trim();
  const catatan = String(formData.get("catatan_klinis") ?? "").trim();
  const tindakan = String(formData.get("tindakan") ?? "").trim();

  if (!kunjunganId) {
    return { pesan: "Gak ada kunjungan hari ini buat pasien ini.", sukses: false };
  }

  const supabase = createClient();

  const { error } = await supabase.from("catatan_klinis").upsert(
    {
      kunjungan_id: kunjunganId,
      diagnosis: diagnosis || null,
      catatan_klinis: catatan || null,
      tindakan: tindakan || null,
      dibuat_oleh: pemanggil.id,
    },
    { onConflict: "kunjungan_id" }
  );

  if (error) {
    return { pesan: `Gagal menyimpan catatan klinis: ${error.message}`, sukses: false };
  }

  revalidatePath(`/dashboard/rekam-medis/${pasienId}`);
  return { pesan: "Catatan klinis berhasil disimpan.", sukses: true };
}
