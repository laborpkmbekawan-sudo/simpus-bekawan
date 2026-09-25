"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

type Hasil = { pesan: string; sukses: boolean };
const PERAN_KELOLA = ["admin", "kapus", "manajemen"];

function teksAtauNull(formData: FormData, nama: string): string | null {
  const nilai = String(formData.get(nama) ?? "").trim();
  return nilai || null;
}

function angkaAtauNull(formData: FormData, nama: string): number | null {
  const nilai = String(formData.get(nama) ?? "").trim();
  if (!nilai) return null;
  const angka = Number(nilai);
  return Number.isFinite(angka) ? angka : null;
}

async function cekAksesKelola() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KELOLA.includes(pemanggil.peran)) return null;
  return pemanggil;
}

export async function tambahKepatuhanUkpAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mencatat kepatuhan UKP.", sukses: false };

  const unitLayanan = String(formData.get("unit_layanan") ?? "");
  const aspekDinilai = String(formData.get("aspek_dinilai") ?? "").trim();
  if (!unitLayanan || !aspekDinilai) {
    return { pesan: "Unit layanan dan aspek yang dinilai wajib diisi.", sukses: false };
  }

  const supabase = createClient();
  const { error } = await supabase.from("ukp_kepatuhan").insert({
    tanggal: teksAtauNull(formData, "tanggal") ?? new Date().toISOString().slice(0, 10),
    unit_layanan: unitLayanan,
    aspek_dinilai: aspekDinilai,
    skor_kepatuhan: angkaAtauNull(formData, "skor_kepatuhan"),
    temuan: teksAtauNull(formData, "temuan"),
    rekomendasi: teksAtauNull(formData, "rekomendasi"),
    dibuat_oleh: pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/ukp");
  return { pesan: "Kepatuhan tercatat.", sukses: true };
}

export async function perbaruiKepatuhanUkpAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mengubah data ini.", sukses: false };

  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Data gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("ukp_kepatuhan")
    .update({
      penanggung_jawab_id: teksAtauNull(formData, "penanggung_jawab_id"),
      status_tindak_lanjut: String(formData.get("status_tindak_lanjut") ?? "belum_sesuai"),
      bukti_tindak_lanjut: teksAtauNull(formData, "bukti_tindak_lanjut"),
    })
    .eq("id", id);

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/ukp");
  return { pesan: "Tersimpan.", sukses: true };
}
