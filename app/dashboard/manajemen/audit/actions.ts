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

export async function tambahTemuanAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mencatat temuan audit.", sukses: false };

  const jenisAudit = String(formData.get("jenis_audit") ?? "");
  const temuan = String(formData.get("temuan") ?? "").trim();
  if (!jenisAudit || !temuan) return { pesan: "Jenis audit dan uraian temuan wajib diisi.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("audit_temuan").insert({
    tanggal: teksAtauNull(formData, "tanggal") ?? new Date().toISOString().slice(0, 10),
    jenis_audit: jenisAudit,
    temuan,
    rekomendasi: teksAtauNull(formData, "rekomendasi"),
    batas_waktu: teksAtauNull(formData, "batas_waktu"),
    dibuat_oleh: pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/audit");
  return { pesan: "Temuan tercatat.", sukses: true };
}

export async function perbaruiTemuanAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mengubah data ini.", sukses: false };

  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Data gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("audit_temuan")
    .update({
      penanggung_jawab_id: teksAtauNull(formData, "penanggung_jawab_id"),
      status_kepatuhan: String(formData.get("status_kepatuhan") ?? "belum_sesuai"),
      bukti_tindak_lanjut: teksAtauNull(formData, "bukti_tindak_lanjut"),
    })
    .eq("id", id);

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/audit");
  return { pesan: "Tersimpan.", sukses: true };
}
