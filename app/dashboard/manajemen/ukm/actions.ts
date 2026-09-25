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

export async function tambahKegiatanUkmAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mencatat kegiatan UKM.", sukses: false };

  const upaya = String(formData.get("upaya") ?? "");
  const jenisKegiatan = String(formData.get("jenis_kegiatan") ?? "").trim();
  const desaWilayah = String(formData.get("desa_wilayah") ?? "").trim();
  if (!upaya || !jenisKegiatan || !desaWilayah) {
    return { pesan: "Upaya, jenis kegiatan, dan desa/wilayah wajib diisi.", sukses: false };
  }

  const supabase = createClient();
  const { error } = await supabase.from("ukm_kegiatan").insert({
    tanggal: teksAtauNull(formData, "tanggal") ?? new Date().toISOString().slice(0, 10),
    upaya,
    jenis_kegiatan: jenisKegiatan,
    desa_wilayah: desaWilayah,
    sasaran: angkaAtauNull(formData, "sasaran"),
    capaian: angkaAtauNull(formData, "capaian"),
    petugas_pelaksana_id: teksAtauNull(formData, "petugas_pelaksana_id"),
    hasil: teksAtauNull(formData, "hasil"),
    dibuat_oleh: pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/ukm");
  return { pesan: "Kegiatan tercatat.", sukses: true };
}

export async function perbaruiKegiatanUkmAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mengubah data ini.", sukses: false };

  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Data gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("ukm_kegiatan")
    .update({
      capaian: angkaAtauNull(formData, "capaian"),
      tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
      status: String(formData.get("status") ?? "terbuka"),
    })
    .eq("id", id);

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/ukm");
  return { pesan: "Tersimpan.", sukses: true };
}
