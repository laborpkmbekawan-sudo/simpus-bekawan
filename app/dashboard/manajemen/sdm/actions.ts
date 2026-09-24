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

export async function tambahDokumenAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mengelola data ini.", sukses: false };

  const pegawaiId = String(formData.get("pegawai_id") ?? "");
  const jenis = String(formData.get("jenis") ?? "");
  if (!pegawaiId || !jenis) return { pesan: "Pilih pegawai dan jenis dokumen dulu.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("pegawai_dokumen").insert({
    pegawai_id: pegawaiId,
    jenis,
    nomor: teksAtauNull(formData, "nomor"),
    nama_dokumen: teksAtauNull(formData, "nama_dokumen"),
    tanggal_terbit: teksAtauNull(formData, "tanggal_terbit"),
    tanggal_kedaluwarsa: teksAtauNull(formData, "tanggal_kedaluwarsa"),
    catatan: teksAtauNull(formData, "catatan"),
  });

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/sdm");
  return { pesan: "Dokumen tersimpan.", sukses: true };
}

export async function hapusDokumenAction(id: string) {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return;

  const supabase = createClient();
  await supabase.from("pegawai_dokumen").delete().eq("id", id);

  revalidatePath("/dashboard/manajemen/sdm");
}
