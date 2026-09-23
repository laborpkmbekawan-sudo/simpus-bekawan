"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

const PERAN_KLINIS = ["admin", "dokter", "dokter_gigi", "perawat", "bidan"];

type Hasil = { pesan: string; sukses: boolean };

// Satu pintu cek akses buat SEMUA aksi pelayanan:
// 1. peran klinis, 2. kunjungan ada dan belum selesai,
// 3. admin, atau pegawai yang punya akses ke klaster tujuan kunjungan.
async function cekAkses(kunjunganId: string) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KLINIS.includes(pemanggil.peran)) {
    return { ok: false as const, pesan: "Cuma tenaga klinis yang boleh melayani pasien." };
  }

  const supabase = createClient();
  const { data: kunjungan } = await supabase
    .from("kunjungan")
    .select("id, status, klaster_tujuan_id")
    .eq("id", kunjunganId)
    .single();

  if (!kunjungan) return { ok: false as const, pesan: "Kunjungan gak ditemukan." };
  if (kunjungan.status === "selesai") {
    return { ok: false as const, pesan: "Kunjungan ini sudah selesai, gak bisa diubah lagi." };
  }

  if (pemanggil.peran !== "admin") {
    const { data: akses } = await supabase
      .from("akses_klaster")
      .select("id")
      .eq("pegawai_id", pemanggil.id)
      .eq("klaster_id", kunjungan.klaster_tujuan_id)
      .maybeSingle();
    if (!akses) return { ok: false as const, pesan: "Kamu gak punya akses ke klaster kunjungan ini." };
  }

  return { ok: true as const, pemanggil, supabase };
}

export async function simpanCatatanKlinisAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  // SOAP: S = subjektif, O = objektif, A = diagnosis, P = tindakan (terapi / rencana).
  const subjektif = String(formData.get("subjektif") ?? "").trim();
  const objektif = String(formData.get("objektif") ?? "").trim();
  const diagnosis = String(formData.get("diagnosis") ?? "").trim();
  const kodeIcd10 = String(formData.get("kode_icd10") ?? "").trim().toUpperCase();
  const tindakan = String(formData.get("tindakan") ?? "").trim();

  const { error } = await akses.supabase.from("catatan_klinis").upsert(
    {
      kunjungan_id: kunjunganId,
      subjektif: subjektif || null,
      objektif: objektif || null,
      diagnosis: diagnosis || null,
      kode_icd10: kodeIcd10 || null,
      tindakan: tindakan || null,
      dibuat_oleh: akses.pemanggil.id,
    },
    { onConflict: "kunjungan_id" }
  );

  if (error) return { pesan: `Gagal menyimpan catatan klinis: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: "Catatan klinis tersimpan.", sukses: true };
}

function angkaAtauNull(formData: FormData, nama: string): number | null {
  const nilai = String(formData.get(nama) ?? "").trim();
  if (!nilai) return null;
  const angka = Number(nilai);
  return Number.isFinite(angka) ? angka : null;
}

function teksAtauNull(formData: FormData, nama: string): string | null {
  const nilai = String(formData.get(nama) ?? "").trim();
  return nilai || null;
}

export async function simpanPelayananIbuAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const { error } = await akses.supabase.from("pelayanan_ibu").upsert(
    {
      kunjungan_id: kunjunganId,
      usia_kehamilan_minggu: angkaAtauNull(formData, "usia_kehamilan_minggu"),
      gravida: angkaAtauNull(formData, "gravida"),
      para: angkaAtauNull(formData, "para"),
      abortus: angkaAtauNull(formData, "abortus"),
      hpht: teksAtauNull(formData, "hpht"),
      hpl: teksAtauNull(formData, "hpl"),
      td_sistolik: angkaAtauNull(formData, "td_sistolik"),
      td_diastolik: angkaAtauNull(formData, "td_diastolik"),
      berat_badan: angkaAtauNull(formData, "berat_badan"),
      lila: angkaAtauNull(formData, "lila"),
      tfu: angkaAtauNull(formData, "tfu"),
      djj: angkaAtauNull(formData, "djj"),
      status_risiko: String(formData.get("status_risiko") ?? "rendah"),
      faktor_risiko: teksAtauNull(formData, "faktor_risiko"),
      catatan: teksAtauNull(formData, "catatan"),
      dibuat_oleh: akses.pemanggil.id,
    },
    { onConflict: "kunjungan_id" }
  );

  if (error) return { pesan: `Gagal menyimpan data ibu: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: "Data pelayanan ibu tersimpan.", sukses: true };
}

export async function simpanPelayananAnakAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const { error } = await akses.supabase.from("pelayanan_anak").upsert(
    {
      kunjungan_id: kunjunganId,
      berat_badan: angkaAtauNull(formData, "berat_badan"),
      panjang_tinggi_badan: angkaAtauNull(formData, "panjang_tinggi_badan"),
      lingkar_kepala: angkaAtauNull(formData, "lingkar_kepala"),
      status_gizi: teksAtauNull(formData, "status_gizi"),
      status_tumbuh_kembang: teksAtauNull(formData, "status_tumbuh_kembang"),
      klasifikasi_mtbs: teksAtauNull(formData, "klasifikasi_mtbs"),
      keluhan: teksAtauNull(formData, "keluhan"),
      catatan: teksAtauNull(formData, "catatan"),
      rencana_tindak_lanjut: teksAtauNull(formData, "rencana_tindak_lanjut"),
      dibuat_oleh: akses.pemanggil.id,
    },
    { onConflict: "kunjungan_id" }
  );

  if (error) return { pesan: `Gagal menyimpan data anak: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: "Data pelayanan anak tersimpan.", sukses: true };
}

export async function catatSkriningAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const jenisSkrining = String(formData.get("jenis_skrining") ?? "");
  if (!jenisSkrining) return { pesan: "Pilih jenis skrining dulu.", sukses: false };

  const { error } = await akses.supabase.from("skrining_klaster2").insert({
    kunjungan_id: kunjunganId,
    jenis_skrining: jenisSkrining,
    hasil_pemeriksaan: teksAtauNull(formData, "hasil_pemeriksaan"),
    klasifikasi: teksAtauNull(formData, "klasifikasi"),
    masalah_ditemukan: teksAtauNull(formData, "masalah_ditemukan"),
    tindakan: teksAtauNull(formData, "tindakan_skrining"),
    edukasi: teksAtauNull(formData, "edukasi"),
    rujukan: teksAtauNull(formData, "rujukan"),
    tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
    dicatat_oleh: akses.pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan skrining: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: "Skrining tersimpan.", sukses: true };
}

export async function batalkanSkriningAction(skriningId: string, kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  await akses.supabase
    .from("skrining_klaster2")
    .update({ dibatalkan: true })
    .eq("id", skriningId)
    .eq("kunjungan_id", kunjunganId);

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
}

export async function catatImunisasiAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const pasienId = String(formData.get("pasien_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const jenisVaksin = String(formData.get("jenis_vaksin") ?? "").trim();
  if (!jenisVaksin) return { pesan: "Isi jenis vaksin dulu.", sukses: false };

  const { error } = await akses.supabase.from("pemberian_imunisasi").insert({
    kunjungan_id: kunjunganId,
    pasien_id: pasienId,
    jenis_vaksin: jenisVaksin,
    dosis: teksAtauNull(formData, "dosis"),
    rute: teksAtauNull(formData, "rute"),
    nomor_batch: teksAtauNull(formData, "nomor_batch"),
    tanggal_kedaluwarsa: teksAtauNull(formData, "tanggal_kedaluwarsa"),
    tanggal_pemberian: teksAtauNull(formData, "tanggal_pemberian") ?? new Date().toISOString().slice(0, 10),
    reaksi_kipi: teksAtauNull(formData, "reaksi_kipi"),
    jadwal_berikutnya: teksAtauNull(formData, "jadwal_berikutnya"),
    diberikan_oleh: akses.pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan imunisasi: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: "Imunisasi tersimpan.", sukses: true };
}

export async function batalkanImunisasiAction(imunisasiId: string, kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  await akses.supabase
    .from("pemberian_imunisasi")
    .update({ dibatalkan: true })
    .eq("id", imunisasiId)
    .eq("kunjungan_id", kunjunganId);

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
}

export async function catatTindakanAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const tarifLayananId = String(formData.get("tarif_layanan_id") ?? "");
  if (!tarifLayananId) return { pesan: "Pilih tindakan dulu.", sukses: false };

  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  let daftarBhp: { bhp_id: string; jumlah: number }[] = [];
  try {
    const mentah = JSON.parse(String(formData.get("daftar_bhp") ?? "[]"));
    daftarBhp = (Array.isArray(mentah) ? mentah : [])
      .map((b) => ({ bhp_id: String(b.bhp_id), jumlah: Number(b.jumlah) }))
      .filter((b) => Number.isFinite(b.jumlah) && b.jumlah >= 0);
  } catch {
    return { pesan: "Data BHP gak valid.", sukses: false };
  }

  const { error } = await akses.supabase.rpc("catat_tindakan_kunjungan", {
    p_kunjungan_id: kunjunganId,
    p_tarif_layanan_id: tarifLayananId,
    p_daftar_bhp: daftarBhp,
  });

  if (error) return { pesan: `Gagal mencatat tindakan: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: "Tindakan tercatat, stok BHP kepotong otomatis.", sukses: true };
}

export async function batalkanTindakanAction(tindakanId: string, kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  // Pastikan tindakan ini memang milik kunjungan yang lagi dilayani.
  const { data: tindakan } = await akses.supabase
    .from("kunjungan_tindakan")
    .select("id")
    .eq("id", tindakanId)
    .eq("kunjungan_id", kunjunganId)
    .maybeSingle();
  if (!tindakan) return;

  await akses.supabase.rpc("batalkan_tindakan_kunjungan", { p_tindakan_id: tindakanId });
  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
}

export async function selesaikanPelayananAction(kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  await akses.supabase.from("kunjungan").update({ status: "selesai" }).eq("id", kunjunganId);
  revalidatePath("/dashboard/antrian");
  redirect("/dashboard/antrian");
}
