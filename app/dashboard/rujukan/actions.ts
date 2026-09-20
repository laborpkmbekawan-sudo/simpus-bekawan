"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { normalisasiNoRm } from "@/lib/lokasi";

const PERAN_KLINIS = ["admin", "dokter", "dokter_gigi", "perawat", "bidan"];

type Hasil = { pesan: string; sukses: boolean };

function gabungAlamat(p: {
  alamat_jalan: string | null;
  alamat_rt: string | null;
  alamat_rw: string | null;
  alamat_desa: string | null;
  alamat_kecamatan: string | null;
  alamat_kabupaten: string | null;
}) {
  return (
    [
      p.alamat_jalan,
      p.alamat_rt && `RT ${p.alamat_rt}`,
      p.alamat_rw && `RW ${p.alamat_rw}`,
      p.alamat_desa,
      p.alamat_kecamatan,
      p.alamat_kabupaten,
    ]
      .filter(Boolean)
      .join(", ") || null
  );
}

type Klinis = {
  keluhan_utama: string | null;
  td_sistolik: number | null;
  td_diastolik: number | null;
  nadi: number | null;
  frekuensi_napas: number | null;
  suhu: number | null;
  spo2: number | null;
  gcs: number | null;
  berat_badan: number | null;
  pemeriksaan_fisik: string | null;
  pemeriksaan_penunjang: string | null;
  terapi_diberikan: string | null;
};

// [kolom, label, min, max, harus bulat]
const BATAS_TTV: [keyof Klinis, string, number, number, boolean][] = [
  ["td_sistolik", "Tekanan darah sistolik", 40, 300, true],
  ["td_diastolik", "Tekanan darah diastolik", 20, 200, true],
  ["nadi", "Nadi", 20, 250, true],
  ["frekuensi_napas", "Frekuensi napas", 5, 80, true],
  ["suhu", "Suhu", 30, 45, false],
  ["spo2", "SpO2", 50, 100, true],
  ["gcs", "GCS", 3, 15, true],
  ["berat_badan", "Berat badan", 0.5, 400, false],
];

// Kosong -> null. Bukan angka -> NaN (ditolak di validasi).
function bacaAngka(formData: FormData, nama: string): number | null {
  const mentah = String(formData.get(nama) ?? "").trim().replace(",", ".");
  if (!mentah) return null;
  const n = Number(mentah);
  return Number.isFinite(n) ? n : NaN;
}

function bacaTeks(formData: FormData, nama: string): string | null {
  return String(formData.get(nama) ?? "").trim() || null;
}

// Cek rentang tiap tanda vital. Return pesan error atau null kalau aman.
function cekTtv(k: Klinis): string | null {
  for (const [kolom, label, min, max, bulat] of BATAS_TTV) {
    const nilai = k[kolom] as number | null;
    if (nilai === null) continue;
    if (Number.isNaN(nilai) || nilai < min || nilai > max || (bulat && !Number.isInteger(nilai))) {
      return `${label} gak valid (isi angka ${min}-${max}${bulat ? ", bulat" : ""}).`;
    }
  }
  if ((k.td_sistolik === null) !== (k.td_diastolik === null)) {
    return "Isi tekanan darah lengkap (sistolik dan diastolik).";
  }
  if (k.td_sistolik !== null && k.td_diastolik !== null && k.td_sistolik <= k.td_diastolik) {
    return "Sistolik harus lebih besar dari diastolik.";
  }
  return null;
}

// Identitas pasien yang disalin ke baris rujukan (snapshot).
type SalinanPasien = {
  pasien_id: string | null;
  kunjungan_id: string | null;
  pasien_no_rm_asal: string;
  pasien_nama: string;
  pasien_nik: string | null;
  pasien_tanggal_lahir: string | null;
  pasien_jenis_kelamin: string | null;
  pasien_alamat: string | null;
  pasien_jenis_penjamin: string | null;
  pasien_no_bpjs: string | null;
  pasien_alergi: string | null;
};

export async function buatRujukanAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KLINIS.includes(pemanggil.peran)) {
    return { pesan: "Cuma tenaga klinis yang boleh membuat rujukan.", sukses: false };
  }

  const jenis = String(formData.get("jenis") ?? "internal");
  const keLokasiId = String(formData.get("ke_lokasi_id") ?? "");
  const tujuanEksternal = String(formData.get("tujuan_eksternal") ?? "").trim();
  const poliTujuan = String(formData.get("poli_tujuan") ?? "").trim();
  const diagnosis = String(formData.get("diagnosis") ?? "").trim();
  const alasan = String(formData.get("alasan") ?? "").trim();

  const klinis: Klinis = {
    keluhan_utama: bacaTeks(formData, "keluhan_utama"),
    td_sistolik: bacaAngka(formData, "td_sistolik"),
    td_diastolik: bacaAngka(formData, "td_diastolik"),
    nadi: bacaAngka(formData, "nadi"),
    frekuensi_napas: bacaAngka(formData, "frekuensi_napas"),
    suhu: bacaAngka(formData, "suhu"),
    spo2: bacaAngka(formData, "spo2"),
    gcs: bacaAngka(formData, "gcs"),
    berat_badan: bacaAngka(formData, "berat_badan"),
    pemeriksaan_fisik: bacaTeks(formData, "pemeriksaan_fisik"),
    pemeriksaan_penunjang: bacaTeks(formData, "pemeriksaan_penunjang"),
    terapi_diberikan: bacaTeks(formData, "terapi_diberikan"),
  };
  const salahTtv = cekTtv(klinis);
  if (salahTtv) return { pesan: salahTtv, sukses: false };

  // Lokasi asal: pegawai biasa = lokasi kerjanya sendiri (gak dipercaya dari
  // form). Admin boleh pilih bebas.
  const admin = pemanggil.peran === "admin";
  const dariLokasiId = admin ? String(formData.get("dari_lokasi_id") ?? "") : pemanggil.lokasi_id ?? "";

  if (!dariLokasiId) {
    return { pesan: "Akunmu belum punya lokasi kerja. Minta admin mengisinya di Data Pegawai.", sukses: false };
  }
  if (jenis !== "internal" && jenis !== "eksternal") return { pesan: "Jenis rujukan gak valid.", sukses: false };
  if (!alasan) return { pesan: "Isi alasan rujukan.", sukses: false };
  if (jenis === "internal" && !keLokasiId) return { pesan: "Pilih lokasi tujuan rujukan.", sukses: false };
  if (jenis === "internal" && keLokasiId === dariLokasiId) {
    return { pesan: "Lokasi asal dan tujuan gak boleh sama.", sukses: false };
  }
  if (jenis === "eksternal" && !tujuanEksternal) {
    return { pesan: "Isi nama rumah sakit / fasilitas tujuan.", sukses: false };
  }

  const supabase = createClient();

  // Cara ambil data pasien ditentukan oleh lokasi ASAL (dari database, bukan dari form):
  // - Pustu  : pasien punya No. RM sendiri dan tidak harus ada di data Induk,
  //            jadi identitasnya diketik manual di form rujukan.
  // - Induk  : pasien dicari lewat No. RM Induk (data pasien terdaftar).
  const { data: lokasiAsal } = await supabase.from("lokasi").select("id, tipe").eq("id", dariLokasiId).maybeSingle();
  if (!lokasiAsal) return { pesan: "Lokasi asal gak ditemukan.", sukses: false };

  let salinan: SalinanPasien;

  if (lokasiAsal.tipe === "pustu") {
    const noRmAsal = String(formData.get("pasien_no_rm_asal") ?? "").trim();
    const nama = String(formData.get("pasien_nama") ?? "").trim();
    const jk = String(formData.get("pasien_jenis_kelamin") ?? "");
    const tglLahir = String(formData.get("pasien_tanggal_lahir") ?? "");
    const nik = String(formData.get("pasien_nik") ?? "").trim();
    const alamat = String(formData.get("pasien_alamat") ?? "").trim();
    const penjamin = String(formData.get("pasien_jenis_penjamin") ?? "umum");
    const noBpjs = String(formData.get("pasien_no_bpjs") ?? "").trim();
    const alergi = String(formData.get("pasien_alergi") ?? "").trim();

    if (!noRmAsal) return { pesan: "Isi No. RM pasien di Pustu.", sukses: false };
    if (!nama) return { pesan: "Isi nama lengkap pasien.", sukses: false };
    if (jk && jk !== "L" && jk !== "P") return { pesan: "Jenis kelamin gak valid.", sukses: false };
    if (tglLahir && (!/^\d{4}-\d{2}-\d{2}$/.test(tglLahir) || tglLahir > new Date().toISOString().slice(0, 10))) {
      return { pesan: "Tanggal lahir gak valid.", sukses: false };
    }
    if (penjamin !== "bpjs" && penjamin !== "umum") return { pesan: "Penjamin gak valid.", sukses: false };

    salinan = {
      pasien_id: null,
      kunjungan_id: null,
      pasien_no_rm_asal: noRmAsal,
      pasien_nama: nama,
      pasien_nik: nik || null,
      pasien_tanggal_lahir: tglLahir || null,
      pasien_jenis_kelamin: jk || null,
      pasien_alamat: alamat || null,
      pasien_jenis_penjamin: penjamin,
      pasien_no_bpjs: penjamin === "bpjs" && noBpjs ? noBpjs : null,
      pasien_alergi: alergi || null,
    };
  } else {
    const noRm = normalisasiNoRm(String(formData.get("no_rm") ?? ""));
    if (!noRm) return { pesan: "Pilih pasien yang mau dirujuk.", sukses: false };

    const { data: pasien } = await supabase.from("pasien").select("*").eq("no_rm", noRm).maybeSingle();
    if (!pasien) return { pesan: `Pasien dengan No. RM ${noRm} gak ditemukan.`, sukses: false };

    // Kunjungan yang dipilih di form (harus milik pasien itu). Kalau tidak ada,
    // pakai kunjungan terbaru hari ini.
    const kunjunganDipilih = String(formData.get("kunjungan_id") ?? "");
    let kunjunganHariIni: { id: string } | null = null;
    if (kunjunganDipilih) {
      const { data: k } = await supabase
        .from("kunjungan")
        .select("id")
        .eq("id", kunjunganDipilih)
        .eq("pasien_id", pasien.id)
        .maybeSingle();
      kunjunganHariIni = k ?? null;
    }
    if (!kunjunganHariIni) {
      const hariIni = new Date().toISOString().slice(0, 10);
      const { data: k } = await supabase
        .from("kunjungan")
        .select("id")
        .eq("pasien_id", pasien.id)
        .eq("tanggal", hariIni)
        .order("dibuat_pada", { ascending: false })
        .limit(1)
        .maybeSingle();
      kunjunganHariIni = k ?? null;
    }

    // Dari Induk: bagian klinis yang dikosongkan diisi dari skrining kunjungan hari ini (kalau ada).
    if (kunjunganHariIni) {
      const { data: skrining } = await supabase
        .from("skrining")
        .select("*")
        .eq("kunjungan_id", kunjunganHariIni.id)
        .maybeSingle();
      if (skrining) {
        klinis.keluhan_utama ??= skrining.keluhan_utama ?? null;
        klinis.td_sistolik ??= skrining.tekanan_darah_sistolik ?? null;
        klinis.td_diastolik ??= skrining.tekanan_darah_diastolik ?? null;
        klinis.nadi ??= skrining.nadi ?? null;
        klinis.frekuensi_napas ??= skrining.frekuensi_napas ?? null;
        klinis.suhu ??= skrining.suhu != null ? Number(skrining.suhu) : null;
        klinis.berat_badan ??= skrining.berat_badan != null ? Number(skrining.berat_badan) : null;
      }
    }

    salinan = {
      pasien_id: pasien.id,
      kunjungan_id: kunjunganHariIni?.id ?? null,
      pasien_no_rm_asal: pasien.no_rm,
      pasien_nama: pasien.nama_lengkap,
      pasien_nik: pasien.nik ?? null,
      pasien_tanggal_lahir: pasien.tanggal_lahir ?? null,
      pasien_jenis_kelamin: pasien.jenis_kelamin ?? null,
      pasien_alamat: gabungAlamat(pasien),
      pasien_jenis_penjamin: pasien.jenis_penjamin ?? null,
      pasien_no_bpjs: pasien.no_bpjs ?? null,
      pasien_alergi: pasien.alergi ?? null,
    };
  }

  // Cek ulang setelah data skrining ikut masuk.
  const salahTtvAkhir = cekTtv(klinis);
  if (salahTtvAkhir) return { pesan: salahTtvAkhir, sukses: false };

  // Rujukan ke rumah sakit/IGD wajib memuat kondisi klinis dasar.
  if (jenis === "eksternal") {
    const kurang: string[] = [];
    if (!klinis.keluhan_utama) kurang.push("keluhan utama");
    if (klinis.td_sistolik === null || klinis.td_diastolik === null) kurang.push("tekanan darah");
    if (klinis.nadi === null) kurang.push("nadi");
    if (klinis.frekuensi_napas === null) kurang.push("frekuensi napas");
    if (klinis.suhu === null) kurang.push("suhu");
    if (kurang.length > 0) {
      return { pesan: `Rujukan ke rumah sakit wajib mencantumkan: ${kurang.join(", ")}.`, sukses: false };
    }
  }

  const { error } = await supabase.from("rujukan").insert({
    ...salinan,
    ...klinis,
    jenis,
    dari_lokasi_id: dariLokasiId,
    ke_lokasi_id: jenis === "internal" ? keLokasiId : null,
    tujuan_eksternal: jenis === "eksternal" ? tujuanEksternal : null,
    poli_tujuan: poliTujuan || null,
    diagnosis: diagnosis || null,
    alasan,
    dibuat_oleh: pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan rujukan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/rujukan");
  return {
    pesan: `Rujukan tersimpan untuk ${salinan.pasien_nama} (RM ${salinan.pasien_no_rm_asal}). Surat bisa dicetak dari daftar di bawah.`,
    sukses: true,
  };
}

export async function ubahStatusRujukanAction(
  id: string,
  statusBaru: "diterima" | "selesai" | "dibatalkan",
  catatan?: string
) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return;

  const supabase = createClient();
  const { data: rujukan } = await supabase
    .from("rujukan")
    .select("id, jenis, status, ke_lokasi_id, dibuat_oleh")
    .eq("id", id)
    .maybeSingle();
  if (!rujukan) return;

  const admin = pemanggil.peran === "admin";
  const penerima = admin || (rujukan.jenis === "internal" && !!rujukan.ke_lokasi_id && rujukan.ke_lokasi_id === pemanggil.lokasi_id);
  const pembuat = admin || rujukan.dibuat_oleh === pemanggil.id;

  let boleh = false;
  if (statusBaru === "diterima") {
    boleh = rujukan.jenis === "internal" && rujukan.status === "dibuat" && penerima;
  } else if (statusBaru === "selesai") {
    boleh =
      rujukan.jenis === "internal"
        ? rujukan.status === "diterima" && penerima
        : rujukan.status === "dibuat" && pembuat;
  } else if (statusBaru === "dibatalkan") {
    boleh = (rujukan.status === "dibuat" || rujukan.status === "diterima") && pembuat;
  }
  if (!boleh) return;

  const perubahan: Record<string, unknown> = { status: statusBaru };
  if (catatan && catatan.trim()) perubahan.catatan_tindak_lanjut = catatan.trim();

  await supabase.from("rujukan").update(perubahan).eq("id", id);
  revalidatePath("/dashboard/rujukan");
}

// Pencarian pasien untuk pemilih di form rujukan (nama, No. RM, atau NIK).
export async function cariPasienAction(
  kata: string
): Promise<{ noRm: string; nama: string; nik: string | null }[]> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KLINIS.includes(pemanggil.peran)) return [];

  // Buang karakter yang merusak sintaks filter PostgREST (koma, kurung, dst).
  const bersih = kata.replace(/[^\p{L}\p{N}\s.'-]/gu, "").trim();
  if (bersih.length < 2) return [];

  const supabase = createClient();
  const { data } = await supabase
    .from("pasien")
    .select("no_rm, nama_lengkap, nik")
    .or(`nama_lengkap.ilike.%${bersih}%,no_rm.ilike.%${bersih}%,nik.ilike.%${bersih}%`)
    .order("nama_lengkap", { ascending: true })
    .limit(10);

  return (data ?? []).map((p) => ({ noRm: p.no_rm, nama: p.nama_lengkap, nik: p.nik ?? null }));
}

// Tandai pembaruan rujukan keluar (diterima / selesai) sebagai sudah dilihat
// oleh pegawai yang sedang login. Dipanggil saat tab Rujukan Keluar dibuka.
export async function tandaiPembaruanRujukanDilihatAction() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !pemanggil.lokasi_id) return;

  const supabase = createClient();
  const sejak = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: daftar } = await supabase
    .from("rujukan")
    .select("id, status")
    .eq("jenis", "internal")
    .eq("dari_lokasi_id", pemanggil.lokasi_id)
    .in("status", ["diterima", "selesai"])
    .gte("diperbarui_pada", sejak)
    .limit(200);
  if (!daftar || daftar.length === 0) return;

  await supabase.from("rujukan_status_dibaca").upsert(
    daftar.map((r) => ({ pegawai_id: pemanggil.id, rujukan_id: r.id, status: r.status })),
    { onConflict: "pegawai_id,rujukan_id,status", ignoreDuplicates: true }
  );
}
