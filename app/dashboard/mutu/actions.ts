"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

type Hasil = { pesan: string; sukses: boolean };

function teksAtauNull(formData: FormData, nama: string): string | null {
  const nilai = String(formData.get(nama) ?? "").trim();
  return nilai || null;
}

export async function laporMutuAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return { pesan: "Kamu harus login dulu.", sukses: false };

  const jenis = String(formData.get("jenis") ?? "");
  const uraian = String(formData.get("uraian") ?? "").trim();
  if (!jenis || !uraian) return { pesan: "Jenis dan uraian wajib diisi.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("mutu_insiden").insert({
    tanggal: teksAtauNull(formData, "tanggal") ?? new Date().toISOString().slice(0, 10),
    jenis,
    uraian,
    tingkat_risiko: String(formData.get("tingkat_risiko") ?? "rendah"),
    pelapor_id: pemanggil.id,
    tindakan_awal: teksAtauNull(formData, "tindakan_awal"),
  });

  if (error) return { pesan: `Gagal melapor: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/mutu");
  return { pesan: "Laporan tersimpan.", sukses: true };
}

export async function perbaruiTindakLanjutAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !["admin", "kapus"].includes(pemanggil.peran)) {
    return { pesan: "Cuma admin/kapus yang boleh mengelola tindak lanjut.", sukses: false };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Data gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("mutu_insiden")
    .update({
      penanggung_jawab_id: teksAtauNull(formData, "penanggung_jawab_id"),
      batas_waktu: teksAtauNull(formData, "batas_waktu"),
      status_tindak_lanjut: String(formData.get("status_tindak_lanjut") ?? "baru"),
      bukti_penyelesaian: teksAtauNull(formData, "bukti_penyelesaian"),
    })
    .eq("id", id);

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/mutu");
  return { pesan: "Tindak lanjut tersimpan.", sukses: true };
}
