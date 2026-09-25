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

export async function tambahKegiatanAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mencatat perencanaan.", sukses: false };

  const tahun = angkaAtauNull(formData, "tahun");
  const jenis = String(formData.get("jenis") ?? "");
  const upaya = String(formData.get("upaya") ?? "");
  const program = String(formData.get("program") ?? "").trim();
  const kegiatan = String(formData.get("kegiatan") ?? "").trim();
  if (!tahun || !jenis || !upaya || !program || !kegiatan) {
    return { pesan: "Tahun, jenis, upaya, program, dan kegiatan wajib diisi.", sukses: false };
  }

  const supabase = createClient();
  const { error } = await supabase.from("perencanaan_kegiatan").insert({
    tahun,
    jenis,
    upaya,
    program,
    kegiatan,
    sasaran: teksAtauNull(formData, "sasaran"),
    volume: teksAtauNull(formData, "volume"),
    jadwal_bulan: angkaAtauNull(formData, "jadwal_bulan"),
    sumber_dana: String(formData.get("sumber_dana") ?? "bok"),
    rencana_anggaran: angkaAtauNull(formData, "rencana_anggaran"),
    dibuat_oleh: pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/perencanaan");
  return { pesan: "Kegiatan tercatat.", sukses: true };
}

export async function perbaruiKegiatanAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mengubah data ini.", sukses: false };

  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Data gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("perencanaan_kegiatan")
    .update({
      penanggung_jawab_id: teksAtauNull(formData, "penanggung_jawab_id"),
      status: String(formData.get("status") ?? "diusulkan"),
      realisasi_anggaran: angkaAtauNull(formData, "realisasi_anggaran"),
      catatan: teksAtauNull(formData, "catatan"),
    })
    .eq("id", id);

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/perencanaan");
  return { pesan: "Tersimpan.", sukses: true };
}
