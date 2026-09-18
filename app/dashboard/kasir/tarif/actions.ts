"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

export async function tambahTarifAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || pemanggil.peran !== "admin") {
    return { pesan: "Cuma admin yang boleh atur tarif." };
  }

  const namaLayanan = String(formData.get("nama_layanan") ?? "").trim();
  const harga = Number(formData.get("harga") ?? 0);

  if (!namaLayanan) {
    return { pesan: "Nama layanan wajib diisi." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("tarif_layanan").insert({ nama_layanan: namaLayanan, harga });

  if (error) {
    return { pesan: `Gagal menyimpan tarif: ${error.message}` };
  }

  revalidatePath("/dashboard/kasir/tarif");
  return { pesan: "" };
}

export async function ubahStatusTarifAction(tarifId: string, aktifBaru: boolean) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || pemanggil.peran !== "admin") return;

  const supabase = createClient();
  await supabase.from("tarif_layanan").update({ aktif: aktifBaru }).eq("id", tarifId);
  revalidatePath("/dashboard/kasir/tarif");
}
