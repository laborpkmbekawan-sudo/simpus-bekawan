"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

type Hasil = { pesan: string; sukses: boolean };
const PERAN_KELOLA = ["admin", "kapus", "manajemen"];

function teksAtauNull(formData: FormData, nama: string): string | null {
  const nilai = String(formData.get(nama) ?? "").trim();
  return nilai || null;
}

export async function tambahDokumenOrganisasiAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KELOLA.includes(pemanggil.peran)) {
    return { pesan: "Cuma admin/kapus/manajemen yang boleh mengelola data ini.", sukses: false };
  }

  const jenis = String(formData.get("jenis") ?? "");
  const judul = String(formData.get("judul") ?? "").trim();
  if (!jenis || !judul) return { pesan: "Jenis dan judul dokumen wajib diisi.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("dokumen_organisasi").insert({
    jenis,
    judul,
    nomor: teksAtauNull(formData, "nomor"),
    tanggal_terbit: teksAtauNull(formData, "tanggal_terbit"),
    tanggal_kedaluwarsa: teksAtauNull(formData, "tanggal_kedaluwarsa"),
    catatan: teksAtauNull(formData, "catatan"),
    diunggah_oleh: pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/dokumen");
  return { pesan: "Dokumen tercatat.", sukses: true };
}
