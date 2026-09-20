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
  const kategori = String(formData.get("kategori") ?? "Umum").trim() || "Umum";
  const klasterTerkaitId = String(formData.get("klaster_terkait_id") ?? "").trim();

  if (!namaLayanan) {
    return { pesan: "Nama layanan wajib diisi." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("tarif_layanan").insert({
    nama_layanan: namaLayanan,
    harga,
    kategori,
    klaster_terkait_id: klasterTerkaitId || null,
  });

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

// Impor banyak baris sekaligus. Format per baris (dipisah baris baru):
//   Nama Layanan;Harga;Kategori
// Kategori boleh dikosongkan, defaultnya "Umum".
export async function importMassalTarifAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || pemanggil.peran !== "admin") {
    return { pesan: "Cuma admin yang boleh atur tarif." };
  }

  const teks = String(formData.get("teks_impor") ?? "").trim();
  if (!teks) {
    return { pesan: "Tempel data dulu sebelum impor." };
  }

  const baris = teks
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);

  const dataInsert = baris.map((b) => {
    const kolom = b.split(";").map((k) => k.trim());
    return {
      nama_layanan: kolom[0] ?? "",
      harga: Number(kolom[1] ?? 0) || 0,
      kategori: kolom[2] || "Umum",
    };
  }).filter((d) => d.nama_layanan);

  if (dataInsert.length === 0) {
    return { pesan: "Gak ada baris yang valid. Format: Nama;Harga;Kategori" };
  }

  const supabase = createClient();
  const { error } = await supabase.from("tarif_layanan").insert(dataInsert);

  if (error) {
    return { pesan: `Gagal impor: ${error.message}` };
  }

  revalidatePath("/dashboard/kasir/tarif");
  return { pesan: `Berhasil impor ${dataInsert.length} tarif.` };
}
