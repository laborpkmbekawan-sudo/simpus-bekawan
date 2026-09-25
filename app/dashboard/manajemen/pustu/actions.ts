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
  return nilai === "" ? null : Number(nilai);
}

async function cekAksesKelola() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KELOLA.includes(pemanggil.peran)) return null;
  return pemanggil;
}

// ---------- Laporan Pustu ----------

export async function tambahLaporanPustuAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mencatat laporan Pustu.", sukses: false };

  const lokasiId = String(formData.get("lokasi_id") ?? "");
  const bulanInput = String(formData.get("bulan") ?? ""); // "2026-09"
  if (!lokasiId || !bulanInput) return { pesan: "Pustu dan bulan wajib diisi.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("pustu_laporan").insert({
    lokasi_id: lokasiId,
    bulan: `${bulanInput}-01`,
    jumlah_kunjungan: angkaAtauNull(formData, "jumlah_kunjungan"),
    jumlah_rujukan: angkaAtauNull(formData, "jumlah_rujukan"),
    status_logistik: String(formData.get("status_logistik") ?? "aman"),
    kendala: teksAtauNull(formData, "kendala"),
    dibuat_oleh: pemanggil.id,
  });

  if (error) {
    if (error.code === "23505") return { pesan: "Laporan untuk Pustu dan bulan ini sudah ada.", sukses: false };
    return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };
  }

  revalidatePath("/dashboard/manajemen/pustu");
  return { pesan: "Laporan Pustu tercatat.", sukses: true };
}

export async function perbaruiLaporanPustuAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mengubah data ini.", sukses: false };

  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Data gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("pustu_laporan")
    .update({
      tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
      status: String(formData.get("status") ?? "terbuka"),
    })
    .eq("id", id);

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/pustu");
  return { pesan: "Tersimpan.", sukses: true };
}

// ---------- Jejaring Fasyankes ----------

export async function tambahJejaringAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mendaftarkan jejaring.", sukses: false };

  const nama = String(formData.get("nama") ?? "").trim();
  const jenis = String(formData.get("jenis") ?? "");
  if (!nama || !jenis) return { pesan: "Nama dan jenis fasyankes wajib diisi.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("jejaring_fasyankes").insert({
    nama,
    jenis,
    penanggung_jawab: teksAtauNull(formData, "penanggung_jawab"),
    kontak: teksAtauNull(formData, "kontak"),
    alamat: teksAtauNull(formData, "alamat"),
    lokasi_terdekat_id: teksAtauNull(formData, "lokasi_terdekat_id"),
    dibuat_oleh: pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/pustu");
  return { pesan: "Jejaring fasyankes terdaftar.", sukses: true };
}

export async function perbaruiJejaringAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await cekAksesKelola();
  if (!pemanggil) return { pesan: "Cuma admin/kapus/manajemen yang boleh mengubah data ini.", sukses: false };

  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Data gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("jejaring_fasyankes")
    .update({
      status_kerjasama: String(formData.get("status_kerjasama") ?? "aktif"),
      catatan: teksAtauNull(formData, "catatan"),
    })
    .eq("id", id);

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/pustu");
  return { pesan: "Tersimpan.", sukses: true };
}
