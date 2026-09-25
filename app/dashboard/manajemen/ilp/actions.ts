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

export async function tambahKegiatanIlpAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mencatat kegiatan ILP.", sukses: false };

  const siklusHidup = String(formData.get("siklus_hidup") ?? "");
  const jenisKegiatan = String(formData.get("jenis_kegiatan") ?? "");
  const desaWilayah = String(formData.get("desa_wilayah") ?? "").trim();
  if (!siklusHidup || !jenisKegiatan || !desaWilayah) {
    return { pesan: "Siklus hidup, jenis kegiatan, dan desa/wilayah wajib diisi.", sukses: false };
  }

  const supabase = createClient();
  const { error } = await supabase.from("ilp_kegiatan").insert({
    tanggal: teksAtauNull(formData, "tanggal") ?? new Date().toISOString().slice(0, 10),
    siklus_hidup: siklusHidup,
    jenis_kegiatan: jenisKegiatan,
    desa_wilayah: desaWilayah,
    sasaran: angkaAtauNull(formData, "sasaran"),
    capaian: angkaAtauNull(formData, "capaian"),
    kader_terlibat: teksAtauNull(formData, "kader_terlibat"),
    kendala: teksAtauNull(formData, "kendala"),
    dibuat_oleh: pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/ilp");
  return { pesan: "Kegiatan tercatat.", sukses: true };
}

export async function perbaruiKegiatanIlpAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mengubah data ini.", sukses: false };

  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Data gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("ilp_kegiatan")
    .update({
      penanggung_jawab_id: teksAtauNull(formData, "penanggung_jawab_id"),
      capaian: angkaAtauNull(formData, "capaian"),
      tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
      status: String(formData.get("status") ?? "terbuka"),
    })
    .eq("id", id);

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/ilp");
  return { pesan: "Tersimpan.", sukses: true };
}
