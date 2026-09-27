"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

const PERAN_FARMASI = ["admin", "farmasi"];

async function cekAksesFarmasi() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_FARMASI.includes(pemanggil.peran)) {
    return { ok: false as const, pesan: "Cuma farmasi/admin yang boleh mengelola resep." };
  }
  return { ok: true as const, pemanggil, supabase: createClient() };
}

export async function verifikasiResepAction(resepObatId: string) {
  const akses = await cekAksesFarmasi();
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const { error } = await akses.supabase.rpc("verifikasi_resep_obat", { p_resep_obat_id: resepObatId });
  if (error) return { pesan: `Gagal verifikasi: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/farmasi/resep");
  return { pesan: "Resep diverifikasi.", sukses: true };
}

export async function serahkanResepAction(resepObatId: string) {
  const akses = await cekAksesFarmasi();
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const { error } = await akses.supabase.rpc("serahkan_resep_obat", { p_resep_obat_id: resepObatId });
  if (error) return { pesan: `Gagal menyerahkan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/farmasi/resep");
  revalidatePath("/dashboard/farmasi");
  return { pesan: "Resep sudah diserahkan, stok kepotong otomatis.", sukses: true };
}

export async function batalkanResepFarmasiAction(resepObatId: string) {
  const akses = await cekAksesFarmasi();
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const { error } = await akses.supabase.rpc("batalkan_resep_obat", { p_resep_obat_id: resepObatId });
  if (error) return { pesan: `Gagal membatalkan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/farmasi/resep");
  return { pesan: "Resep dibatalkan.", sukses: true };
}
