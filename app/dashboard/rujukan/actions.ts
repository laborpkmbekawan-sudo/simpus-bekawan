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
    if (!noRm) return { pesan: "Isi No. RM pasien.", sukses: false };

    const { data: pasien } = await supabase.from("pasien").select("*").eq("no_rm", noRm).maybeSingle();
    if (!pasien) return { pesan: `Pasien dengan No. RM ${noRm} gak ditemukan.`, sukses: false };

    const hariIni = new Date().toISOString().slice(0, 10);
    const { data: kunjunganHariIni } = await supabase
      .from("kunjungan")
      .select("id")
      .eq("pasien_id", pasien.id)
      .eq("tanggal", hariIni)
      .order("dibuat_pada", { ascending: false })
      .limit(1)
      .maybeSingle();

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

  const { error } = await supabase.from("rujukan").insert({
    ...salinan,
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
