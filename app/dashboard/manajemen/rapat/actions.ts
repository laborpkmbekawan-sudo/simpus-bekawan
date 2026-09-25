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

export async function tambahRapatAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mencatat rapat.", sukses: false };

  const judul = String(formData.get("judul") ?? "").trim();
  const jenis = String(formData.get("jenis") ?? "");
  if (!judul || !jenis) return { pesan: "Judul dan jenis rapat wajib diisi.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("rapat").insert({
    tanggal: teksAtauNull(formData, "tanggal") ?? new Date().toISOString().slice(0, 10),
    jenis,
    judul,
    notulen: teksAtauNull(formData, "notulen"),
    dibuat_oleh: pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/rapat");
  return { pesan: "Rapat tercatat.", sukses: true };
}

export async function tambahTindakLanjutAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh menambah tindak lanjut.", sukses: false };

  const rapatId = String(formData.get("rapat_id") ?? "");
  const uraian = String(formData.get("uraian") ?? "").trim();
  if (!rapatId || !uraian) return { pesan: "Uraian tindak lanjut wajib diisi.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("rapat_tindak_lanjut").insert({
    rapat_id: rapatId,
    uraian,
    penanggung_jawab_id: teksAtauNull(formData, "penanggung_jawab_id"),
    batas_waktu: teksAtauNull(formData, "batas_waktu"),
  });

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/rapat");
  return { pesan: "Tindak lanjut ditambahkan.", sukses: true };
}

export async function perbaruiStatusTindakLanjutAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mengubah status.", sukses: false };

  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Data gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("rapat_tindak_lanjut")
    .update({
      status: String(formData.get("status") ?? "belum"),
      bukti_penyelesaian: teksAtauNull(formData, "bukti_penyelesaian"),
    })
    .eq("id", id);

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/rapat");
  return { pesan: "Tersimpan.", sukses: true };
}
