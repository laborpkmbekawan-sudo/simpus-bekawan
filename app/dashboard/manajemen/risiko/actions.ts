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

export async function tambahRisikoAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mengelola register risiko.", sukses: false };

  const kategori = String(formData.get("kategori") ?? "");
  const uraian = String(formData.get("uraian") ?? "").trim();
  if (!kategori || !uraian) return { pesan: "Kategori dan uraian risiko wajib diisi.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("risiko_manajemen").insert({
    kategori,
    uraian,
    penyebab: teksAtauNull(formData, "penyebab"),
    level_risiko: String(formData.get("level_risiko") ?? "rendah"),
    rencana_mitigasi: teksAtauNull(formData, "rencana_mitigasi"),
    dibuat_oleh: pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/risiko");
  return { pesan: "Risiko tercatat di register.", sukses: true };
}

export async function perbaruiRisikoAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mengubah data ini.", sukses: false };

  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Data gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("risiko_manajemen")
    .update({
      penanggung_jawab_id: teksAtauNull(formData, "penanggung_jawab_id"),
      status: String(formData.get("status") ?? "teridentifikasi"),
      rencana_mitigasi: teksAtauNull(formData, "rencana_mitigasi"),
    })
    .eq("id", id);

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/risiko");
  return { pesan: "Tersimpan.", sukses: true };
}
