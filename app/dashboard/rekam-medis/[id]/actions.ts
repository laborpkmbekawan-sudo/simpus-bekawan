"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

const PERAN_KLINIS = ["admin", "dokter", "dokter_gigi", "perawat", "bidan"];

export async function catatTindakanAction(
  _sebelum: { pesan: string; sukses: boolean } | null,
  formData: FormData
): Promise<{ pesan: string; sukses: boolean }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KLINIS.includes(pemanggil.peran)) {
    return { pesan: "Cuma tenaga klinis yang boleh mencatat tindakan.", sukses: false };
  }

  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const pasienId = String(formData.get("pasien_id") ?? "");
  const tarifLayananId = String(formData.get("tarif_layanan_id") ?? "");
  const daftarBhpMentah = String(formData.get("daftar_bhp") ?? "[]");

  if (!kunjunganId || !tarifLayananId) {
    return { pesan: "Pilih tindakan dulu.", sukses: false };
  }

  let daftarBhp: { bhp_id: string; jumlah: number }[] = [];
  try {
    daftarBhp = JSON.parse(daftarBhpMentah);
  } catch {
    return { pesan: "Data BHP gak valid.", sukses: false };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("catat_tindakan_kunjungan", {
    p_kunjungan_id: kunjunganId,
    p_tarif_layanan_id: tarifLayananId,
    p_daftar_bhp: daftarBhp,
  });

  if (error) {
    return { pesan: `Gagal mencatat tindakan: ${error.message}`, sukses: false };
  }

  revalidatePath(`/dashboard/rekam-medis/${pasienId}`);
  return { pesan: "Tindakan berhasil dicatat, stok BHP kepotong otomatis.", sukses: true };
}

export async function batalkanTindakanAction(tindakanId: string, pasienId: string) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KLINIS.includes(pemanggil.peran)) return;

  const supabase = createClient();
  await supabase.rpc("batalkan_tindakan_kunjungan", { p_tindakan_id: tindakanId });
  revalidatePath(`/dashboard/rekam-medis/${pasienId}`);
}
export async function simpanCatatanKlinisAction(
  _sebelum: { pesan: string; sukses: boolean } | null,
  formData: FormData
): Promise<{ pesan: string; sukses: boolean }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KLINIS.includes(pemanggil.peran)) {
    return { pesan: "Cuma tenaga klinis (dokter/perawat/bidan) yang boleh isi catatan ini.", sukses: false };
  }

  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const pasienId = String(formData.get("pasien_id") ?? "");
  const diagnosis = String(formData.get("diagnosis") ?? "").trim();
  const catatan = String(formData.get("catatan_klinis") ?? "").trim();
  const tindakan = String(formData.get("tindakan") ?? "").trim();

  if (!kunjunganId) {
    return { pesan: "Gak ada kunjungan hari ini buat pasien ini.", sukses: false };
  }

  const supabase = createClient();

  const { error } = await supabase.from("catatan_klinis").upsert(
    {
      kunjungan_id: kunjunganId,
      diagnosis: diagnosis || null,
      catatan_klinis: catatan || null,
      tindakan: tindakan || null,
      dibuat_oleh: pemanggil.id,
    },
    { onConflict: "kunjungan_id" }
  );

  if (error) {
    return { pesan: `Gagal menyimpan catatan klinis: ${error.message}`, sukses: false };
  }

  revalidatePath(`/dashboard/rekam-medis/${pasienId}`);
  return { pesan: "Catatan klinis berhasil disimpan.", sukses: true };
}
