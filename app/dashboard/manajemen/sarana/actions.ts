"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

type Hasil = { pesan: string; sukses: boolean };
const PERAN_KELOLA = ["admin", "kapus", "manajemen"];

function teksAtauNull(formData: FormData, nama: string): string | null {
  const nilai = String(formData.get(nama) ?? "").trim();
  return nilai || null;
}

async function cekAksesKelola() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KELOLA.includes(pemanggil.peran)) return null;
  return pemanggil;
}

export async function tambahAsetAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mencatat aset.", sukses: false };

  const namaAset = String(formData.get("nama_aset") ?? "").trim();
  const kategori = String(formData.get("kategori") ?? "");
  if (!namaAset || !kategori) return { pesan: "Nama aset dan kategori wajib diisi.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("sarana_prasarana").insert({
    nama_aset: namaAset,
    kategori,
    lokasi_id: teksAtauNull(formData, "lokasi_id"),
    kondisi: String(formData.get("kondisi") ?? "baik"),
    tanggal_pemeriksaan: teksAtauNull(formData, "tanggal_pemeriksaan"),
    dibuat_oleh: pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/sarana");
  return { pesan: "Aset tercatat.", sukses: true };
}

export async function perbaruiAsetAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mengubah data ini.", sukses: false };

  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Data gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("sarana_prasarana")
    .update({
      kondisi: String(formData.get("kondisi") ?? "baik"),
      status_perbaikan: String(formData.get("status_perbaikan") ?? "tidak_perlu"),
      tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
    })
    .eq("id", id);

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/sarana");
  return { pesan: "Tersimpan.", sukses: true };
}
