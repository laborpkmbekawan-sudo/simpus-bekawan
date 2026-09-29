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

// ---------- Klaster 3: Skrining Usia Dewasa & Lansia ----------
// Satu tabel dua kelompok (kelompok_usia), sama pola dengan skrining_klaster2.
export async function catatSkriningKlaster3Action(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const kelompokUsia = String(formData.get("kelompok_usia") ?? "");
  const jenisSkrining = String(formData.get("jenis_skrining") ?? "");
  if (!kelompokUsia) return { pesan: "Kelompok usia gak ketahuan.", sukses: false };
  if (!jenisSkrining) return { pesan: "Pilih jenis skrining dulu.", sukses: false };

  const { error } = await akses.supabase.from("skrining_klaster3").insert({
    kunjungan_id: kunjunganId,
    kelompok_usia: kelompokUsia,
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

export async function batalkanSkriningKlaster3Action(skriningId: string, kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  await akses.supabase
    .from("skrining_klaster3")
    .update({ dibatalkan: true })
    .eq("id", skriningId)
    .eq("kunjungan_id", kunjunganId);

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
}

// ---------- Klaster 3: Skrining Kesehatan Jiwa (SRQ-20) ----------
// Skor & kategori dihitung ulang di sini dari checkbox yang beneran
// dikirim, bukan percaya field tersembunyi dari klien.
const SOAL_BUNUH_DIRI = 17; // "Apakah anda mempunyai pikiran mengakhiri hidup?" -- terindikasi walau skor total rendah.
const AMBANG_SKOR_TERINDIKASI = 6;

export async function catatSkriningKeswaAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const jawabanYa: number[] = [];
  for (let nomor = 1; nomor <= 20; nomor++) {
    if (formData.get(`jiwa_q${nomor}`) === "ya") jawabanYa.push(nomor);
  }

  const skor = jawabanYa.length;
  const kategori =
    skor >= AMBANG_SKOR_TERINDIKASI || jawabanYa.includes(SOAL_BUNUH_DIRI)
      ? "terindikasi_masalah_emosional"
      : "tidak_terindikasi";

  const { error } = await akses.supabase.from("skrining_keswa").insert({
    kunjungan_id: kunjunganId,
    jawaban_ya: jawabanYa,
    skor,
    kategori,
    catatan: teksAtauNull(formData, "catatan"),
    tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
    dicatat_oleh: akses.pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan skrining jiwa: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  const pesanKategori =
    kategori === "terindikasi_masalah_emosional"
      ? "Skrining tersimpan. Skor menunjukkan indikasi masalah kesehatan jiwa emosional -- pertimbangkan rujukan."
      : "Skrining tersimpan.";
  return { pesan: pesanKategori, sukses: true };
}

export async function batalkanSkriningKeswaAction(skriningId: string, kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  await akses.supabase
    .from("skrining_keswa")
    .update({ dibatalkan: true })
    .eq("id", skriningId)
    .eq("kunjungan_id", kunjunganId);

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
}

// ---------- Klaster 3: Kesehatan Reproduksi & Calon Pengantin (Caten) ----------
export async function catatKesproCatenAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const angkaAtauNull = (nama: string) => {
    const nilai = String(formData.get(nama) ?? "").trim();
    if (!nilai) return null;
    const angka = Number(nilai);
    return Number.isFinite(angka) ? angka : null;
  };

  const { error } = await akses.supabase.from("pemeriksaan_kespro_caten").insert({
    kunjungan_id: kunjunganId,
    status_caten: String(formData.get("status_caten") ?? "caten"),
    hpht: teksAtauNull(formData, "hpht"),
    lila: angkaAtauNull("lila"),
    imt: angkaAtauNull("imt"),
    hb: angkaAtauNull("hb"),
    golongan_darah: teksAtauNull(formData, "golongan_darah"),
    rhesus: teksAtauNull(formData, "rhesus"),
    status_tt: teksAtauNull(formData, "status_tt"),
    hasil_hiv: String(formData.get("hasil_hiv") ?? "tidak_diperiksa"),
    hasil_sifilis: String(formData.get("hasil_sifilis") ?? "tidak_diperiksa"),
    hasil_hepatitis_b: String(formData.get("hasil_hepatitis_b") ?? "tidak_diperiksa"),
    konseling_diberikan: teksAtauNull(formData, "konseling_diberikan"),
    rekomendasi: String(formData.get("rekomendasi") ?? "layak"),
    tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
    dicatat_oleh: akses.pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan pemeriksaan kespro: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: "Pemeriksaan kespro tersimpan.", sukses: true };
}

export async function batalkanKesproCatenAction(id: string, kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  await akses.supabase
    .from("pemeriksaan_kespro_caten")
    .update({ dibatalkan: true })
    .eq("id", id)
    .eq("kunjungan_id", kunjunganId);

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
}

export async function catatPenyakitMenularAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const { error } = await akses.supabase.from("pemeriksaan_penyakit_menular").insert({
    kunjungan_id: kunjunganId,
    kelompok_usia: String(formData.get("kelompok_usia") ?? "dewasa"),
    terduga_tb: formData.get("terduga_tb") === "ya",
    gejala_tb: teksAtauNull(formData, "gejala_tb"),
    hasil_pemeriksaan_tb: String(formData.get("hasil_pemeriksaan_tb") ?? "tidak_diperiksa"),
    status_pengobatan_tb: String(formData.get("status_pengobatan_tb") ?? "tidak_menjalani"),
    kelompok_risiko_hiv: teksAtauNull(formData, "kelompok_risiko_hiv"),
    hasil_hiv: String(formData.get("hasil_hiv") ?? "tidak_diperiksa"),
    gejala_ims: teksAtauNull(formData, "gejala_ims"),
    hasil_ims: String(formData.get("hasil_ims") ?? "tidak_diperiksa"),
    jenis_ims: teksAtauNull(formData, "jenis_ims"),
    konseling_diberikan: teksAtauNull(formData, "konseling_diberikan"),
    rujukan: teksAtauNull(formData, "rujukan"),
    tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
    dicatat_oleh: akses.pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan skrining: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: "Skrining penyakit menular tersimpan.", sukses: true };
}

export async function batalkanPenyakitMenularAction(id: string, kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  await akses.supabase
    .from("pemeriksaan_penyakit_menular")
    .update({ dibatalkan: true })
    .eq("id", id)
    .eq("kunjungan_id", kunjunganId);

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
}

export async function catatSkriningPtmAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const angkaAtauNull = (nama: string) => {
    const nilai = String(formData.get(nama) ?? "").trim();
    if (!nilai) return null;
    const angka = Number(nilai);
    return Number.isFinite(angka) ? angka : null;
  };

  const { error } = await akses.supabase.from("skrining_ptm_terstruktur").insert({
    kunjungan_id: kunjunganId,
    berat_badan: angkaAtauNull("berat_badan"),
    tinggi_badan: angkaAtauNull("tinggi_badan"),
    imt: angkaAtauNull("imt"),
    lingkar_perut: angkaAtauNull("lingkar_perut"),
    td_sistolik: angkaAtauNull("td_sistolik"),
    td_diastolik: angkaAtauNull("td_diastolik"),
    gula_darah_puasa: angkaAtauNull("gula_darah_puasa"),
    gula_darah_sewaktu: angkaAtauNull("gula_darah_sewaktu"),
    kolesterol_total: angkaAtauNull("kolesterol_total"),
    asam_urat: angkaAtauNull("asam_urat"),
    faktor_risiko: teksAtauNull(formData, "faktor_risiko"),
    hasil_skrining: String(formData.get("hasil_skrining") ?? "normal"),
    tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
    dicatat_oleh: akses.pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan skrining PTM: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: "Skrining PTM tersimpan.", sukses: true };
}

export async function batalkanSkriningPtmAction(id: string, kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  await akses.supabase.from("skrining_ptm_terstruktur").update({ dibatalkan: true }).eq("id", id).eq("kunjungan_id", kunjunganId);

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
}

export async function catatKankerTalasemiaAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const { error } = await akses.supabase.from("skrining_kanker_talasemia").insert({
    kunjungan_id: kunjunganId,
    hasil_iva: String(formData.get("hasil_iva") ?? "tidak_dilakukan"),
    hasil_sadanis: String(formData.get("hasil_sadanis") ?? "tidak_dilakukan"),
    hasil_talasemia: String(formData.get("hasil_talasemia") ?? "tidak_diperiksa"),
    catatan_temuan: teksAtauNull(formData, "catatan_temuan"),
    rujukan: teksAtauNull(formData, "rujukan"),
    tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
    dicatat_oleh: akses.pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan skrining: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: "Skrining kanker & talasemia tersimpan.", sukses: true };
}

export async function batalkanKankerTalasemiaAction(id: string, kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  await akses.supabase.from("skrining_kanker_talasemia").update({ dibatalkan: true }).eq("id", id).eq("kunjungan_id", kunjunganId);

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
}

export async function catatImunisasiWusAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const { error } = await akses.supabase.from("skrining_imunisasi_wus").insert({
    kunjungan_id: kunjunganId,
    status_tt: String(formData.get("status_tt") ?? "belum_diketahui"),
    diberikan_hari_ini: formData.get("diberikan_hari_ini") === "ya",
    jenis_vaksin: teksAtauNull(formData, "jenis_vaksin"),
    nomor_batch: teksAtauNull(formData, "nomor_batch"),
    reaksi_kipi: teksAtauNull(formData, "reaksi_kipi"),
    jadwal_berikutnya: teksAtauNull(formData, "jadwal_berikutnya"),
    catatan: teksAtauNull(formData, "catatan"),
    tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
    dicatat_oleh: akses.pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan skrining imunisasi WUS: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: "Skrining imunisasi WUS tersimpan.", sukses: true };
}

export async function batalkanImunisasiWusAction(id: string, kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  await akses.supabase.from("skrining_imunisasi_wus").update({ dibatalkan: true }).eq("id", id).eq("kunjungan_id", kunjunganId);

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
}

export async function catatKesehatanKerjaAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const angkaAtauNull = (nama: string) => {
    const nilai = String(formData.get(nama) ?? "").trim();
    if (!nilai) return null;
    const angka = Number(nilai);
    return Number.isFinite(angka) ? angka : null;
  };

  const { error } = await akses.supabase.from("pemeriksaan_kesehatan_kerja").insert({
    kunjungan_id: kunjunganId,
    jenis_pekerjaan: teksAtauNull(formData, "jenis_pekerjaan"),
    tempat_kerja: teksAtauNull(formData, "tempat_kerja"),
    lama_bekerja_tahun: angkaAtauNull("lama_bekerja_tahun"),
    pajanan_risiko: teksAtauNull(formData, "pajanan_risiko"),
    keluhan_terkait_kerja: teksAtauNull(formData, "keluhan_terkait_kerja"),
    apd_digunakan: formData.get("apd_digunakan") === "ya",
    hasil_pemeriksaan_fisik: teksAtauNull(formData, "hasil_pemeriksaan_fisik"),
    diagnosis_pak: String(formData.get("diagnosis_pak") ?? "tidak_ada"),
    rekomendasi: teksAtauNull(formData, "rekomendasi"),
    rujukan: teksAtauNull(formData, "rujukan"),
    tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
    dicatat_oleh: akses.pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan pemeriksaan kesehatan kerja: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: "Pemeriksaan kesehatan kerja tersimpan.", sukses: true };
}

export async function batalkanKesehatanKerjaAction(id: string, kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  await akses.supabase.from("pemeriksaan_kesehatan_kerja").update({ dibatalkan: true }).eq("id", id).eq("kunjungan_id", kunjunganId);

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
}

export async function catatUmumPtmLansiaAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const angkaAtauNull = (nama: string) => {
    const nilai = String(formData.get(nama) ?? "").trim();
    if (!nilai) return null;
    const angka = Number(nilai);
    return Number.isFinite(angka) ? angka : null;
  };

  const { error } = await akses.supabase.from("pemeriksaan_umum_ptm_lansia").insert({
    kunjungan_id: kunjunganId,
    keluhan_umum: teksAtauNull(formData, "keluhan_umum"),
    berat_badan: angkaAtauNull("berat_badan"),
    tinggi_badan: angkaAtauNull("tinggi_badan"),
    imt: angkaAtauNull("imt"),
    lingkar_perut: angkaAtauNull("lingkar_perut"),
    td_sistolik: angkaAtauNull("td_sistolik"),
    td_diastolik: angkaAtauNull("td_diastolik"),
    gula_darah_puasa: angkaAtauNull("gula_darah_puasa"),
    gula_darah_sewaktu: angkaAtauNull("gula_darah_sewaktu"),
    kolesterol_total: angkaAtauNull("kolesterol_total"),
    asam_urat: angkaAtauNull("asam_urat"),
    status_gizi: teksAtauNull(formData, "status_gizi"),
    hasil_skrining: String(formData.get("hasil_skrining") ?? "normal"),
    tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
    dicatat_oleh: akses.pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan pemeriksaan: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: "Pemeriksaan umum & PTM lansia tersimpan.", sukses: true };
}

export async function batalkanUmumPtmLansiaAction(id: string, kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  await akses.supabase.from("pemeriksaan_umum_ptm_lansia").update({ dibatalkan: true }).eq("id", id).eq("kunjungan_id", kunjunganId);

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
}

export async function catatTerapiTerpaduLansiaAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const { error } = await akses.supabase.from("terapi_terpadu_lansia").insert({
    kunjungan_id: kunjunganId,
    jenis_terapi: String(formData.get("jenis_terapi") ?? "lainnya"),
    kondisi_yang_ditangani: teksAtauNull(formData, "kondisi_yang_ditangani"),
    hasil_evaluasi: teksAtauNull(formData, "hasil_evaluasi"),
    rencana_lanjutan: teksAtauNull(formData, "rencana_lanjutan"),
    rujukan: teksAtauNull(formData, "rujukan"),
    tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
    dicatat_oleh: akses.pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan terapi: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: "Terapi terpadu lansia tersimpan.", sukses: true };
}

export async function batalkanTerapiTerpaduLansiaAction(id: string, kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  await akses.supabase.from("terapi_terpadu_lansia").update({ dibatalkan: true }).eq("id", id).eq("kunjungan_id", kunjunganId);

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
}

// ---------- Klaster 3: Skrining Geriatri (ADL Katz & GDS-15) ----------
// Skor & kategori dihitung ulang di sini, bukan percaya input klien.
// GDS-15: sebagian soal "Ya"=1 poin, sebagian lain "Tidak"=1 poin (lihat
// GDS_SOAL_TIDAK_POSITIF -- daftar nomor soal yang arahnya kebalik).
const ADL_ITEM_KODE = ["mandi", "berpakaian", "ke_toilet", "berpindah", "kontinensia", "makan"] as const;
const GDS_SOAL_TIDAK_POSITIF = new Set([1, 5, 7, 11, 13]); // soal ini "Tidak" yang bernilai 1 poin, bukan "Ya"

function kategoriAdl(skor: number) {
  if (skor === 6) return "mandiri";
  if (skor >= 4) return "ketergantungan_ringan";
  if (skor >= 2) return "ketergantungan_sedang";
  return "ketergantungan_berat";
}

function kategoriGds(skor: number) {
  if (skor <= 4) return "normal";
  if (skor <= 8) return "depresi_ringan";
  if (skor <= 11) return "depresi_sedang";
  return "depresi_berat";
}

export async function catatSkriningGeriatriAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const adlJawaban: Record<string, boolean> = {};
  let adlSkor = 0;
  for (const kode of ADL_ITEM_KODE) {
    const mandiri = formData.get(`adl_${kode}`) === "mandiri";
    adlJawaban[kode] = mandiri;
    if (mandiri) adlSkor += 1;
  }

  const gdsJawabanYa: number[] = [];
  let gdsSkor = 0;
  for (let nomor = 1; nomor <= 15; nomor++) {
    const dijawabYa = formData.get(`gds_q${nomor}`) === "ya";
    if (dijawabYa) gdsJawabanYa.push(nomor);
    const poin = GDS_SOAL_TIDAK_POSITIF.has(nomor) ? !dijawabYa : dijawabYa;
    if (poin) gdsSkor += 1;
  }

  const adlKategori = kategoriAdl(adlSkor);
  const gdsKategori = kategoriGds(gdsSkor);

  const { error } = await akses.supabase.from("skrining_geriatri").insert({
    kunjungan_id: kunjunganId,
    adl_mandi: adlJawaban.mandi,
    adl_berpakaian: adlJawaban.berpakaian,
    adl_ke_toilet: adlJawaban.ke_toilet,
    adl_berpindah: adlJawaban.berpindah,
    adl_kontinensia: adlJawaban.kontinensia,
    adl_makan: adlJawaban.makan,
    adl_skor: adlSkor,
    adl_kategori: adlKategori,
    gds_jawaban_ya: gdsJawabanYa,
    gds_skor: gdsSkor,
    gds_kategori: gdsKategori,
    catatan: teksAtauNull(formData, "catatan"),
    tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
    dicatat_oleh: akses.pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan skrining geriatri: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  const perluPerhatian = adlKategori !== "mandiri" || gdsKategori !== "normal";
  return {
    pesan: perluPerhatian
      ? "Skrining tersimpan. Ada indikasi ketergantungan ADL dan/atau depresi -- pertimbangkan tindak lanjut."
      : "Skrining tersimpan.",
    sukses: true,
  };
}

export async function batalkanSkriningGeriatriAction(skriningId: string, kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  await akses.supabase
    .from("skrining_geriatri")
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
