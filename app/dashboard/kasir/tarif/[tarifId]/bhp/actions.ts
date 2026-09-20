"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

const PERAN_FARMASI = ["admin", "farmasi"];

export async function tambahResepBhpAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_FARMASI.includes(pemanggil.peran)) {
    return { pesan: "Cuma farmasi/admin yang boleh atur resep BHP." };
  }

  const tarifLayananId = String(formData.get("tarif_layanan_id") ?? "");
  const bhpId = String(formData.get("bhp_id") ?? "");
  const jumlahDefault = Number(formData.get("jumlah_default") ?? 1);

  if (!bhpId) {
    return { pesan: "Pilih BHP dulu." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("resep_bhp_tindakan")
    .upsert(
      { tarif_layanan_id: tarifLayananId, bhp_id: bhpId, jumlah_default: jumlahDefault },
      { onConflict: "tarif_layanan_id,bhp_id" }
    );

  if (error) {
    return { pesan: `Gagal menyimpan: ${error.message}` };
  }

  revalidatePath(`/dashboard/kasir/tarif/${tarifLayananId}/bhp`);
  return { pesan: "" };
}

export async function hapusResepBhpAction(resepId: string, tarifLayananId: string) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_FARMASI.includes(pemanggil.peran)) return;

  const supabase = createClient();
  await supabase.from("resep_bhp_tindakan").delete().eq("id", resepId);
  revalidatePath(`/dashboard/kasir/tarif/${tarifLayananId}/bhp`);
}
