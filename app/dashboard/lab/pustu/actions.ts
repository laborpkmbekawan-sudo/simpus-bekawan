"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hariIniWib, tanggalValid } from "@/lib/format";
import { PERAN_LAB, hitungFlag, teksRujukan, type ParameterLab } from "@/lib/lab";

type Hasil = { pesan: string; sukses: boolean };

// Peran klinis yang boleh melapor dari Pustu (harus berlokasi di Pustu).
const PERAN_PUSTU = ["dokter", "dokter_gigi", "perawat", "bidan"];

function segarkan() {
  revalidatePath("/dashboard/lab/pustu");
  revalidatePath("/dashboard/lab/pustu/input");
  revalidatePath("/dashboard/lab/pustu/stok");
  revalidatePath("/dashboard/lab/pustu/izin");
  revalidatePath("/dashboard/lab/rekap");
}

// Petugas Pustu yang sah: peran klinis + lokasi bertipe 'pustu'.
async function ambilPetugasPustu() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_PUSTU.includes(pemanggil.peran) || !pemanggil.lokasi_id) return null;
  const supabase = createClient();
  const { data: lokasi } = await supabase.from("lokasi").select("id, tipe").eq("id", pemanggil.lokasi_id).single();
  if (!lokasi || lokasi.tipe !== "pustu") return null;
  return { pemanggil, lokasiId: lokasi.id as string };
}

function angka(v: unknown) {
  const t = String(v ?? "").trim().replace(",", ".");
  if (t === "") return 0;
  const n = Number(t);
  return Number.isNaN(n) ? NaN : n;
}

// ---------------------------------------------------------------------------
// Input hasil pemeriksaan dari Pustu
// ---------------------------------------------------------------------------

export async function simpanLaporanPustuAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const petugas = await ambilPetugasPustu();
  if (!petugas) {
    return { pesan: "Cuma petugas yang berlokasi di Pustu yang boleh melapor hasil pemeriksaan.", sukses: false };
  }
  const { pemanggil, lokasiId } = petugas;

  const pemeriksaanId = String(formData.get("pemeriksaan_id") ?? "");
  const nama = String(formData.get("nama_pasien") ?? "").trim();
  const noRm = String(formData.get("no_rm_pustu") ?? "").trim();
  const jk = String(formData.get("jenis_kelamin") ?? "");
  const lahir = String(formData.get("tanggal_lahir") ?? "").trim();
  const periksa = String(formData.get("tanggal_periksa") ?? "").trim() || hariIniWib();
  const catatan = String(formData.get("catatan") ?? "").trim();

  if (!pemeriksaanId) return { pesan: "Pilih jenis pemeriksaan dulu.", sukses: false };
  if (!nama) return { pesan: "Nama pasien wajib diisi.", sukses: false };
  if (jk !== "L" && jk !== "P") return { pesan: "Pilih jenis kelamin pasien (dipakai untuk nilai rujukan).", sukses: false };
  if (lahir && !tanggalValid(lahir)) return { pesan: "Tanggal lahir tidak valid.", sukses: false };
  if (!tanggalValid(periksa)) return { pesan: "Tanggal pemeriksaan tidak valid.", sukses: false };
  if (periksa > hariIniWib()) return { pesan: "Tanggal pemeriksaan tidak boleh di masa depan.", sukses: false };

  let hasilMentah: { parameter_id: string; nilai: string }[] = [];
  try {
    hasilMentah = JSON.parse(String(formData.get("hasil") ?? "[]"));
  } catch {
    return { pesan: "Data hasil gak kebaca, coba lagi.", sukses: false };
  }

  const supabase = createClient();

  // Pemeriksaan harus diizinkan untuk Pustu ini.
  const { data: izin } = await supabase
    .from("lab_pustu_izin")
    .select("id")
    .eq("lokasi_id", lokasiId)
    .eq("pemeriksaan_id", pemeriksaanId)
    .maybeSingle();
  if (!izin) {
    return { pesan: "Pemeriksaan ini belum diizinkan untuk Pustu-mu. Hubungi Lab Induk.", sukses: false };
  }

  const [{ data: pem }, { data: paramMentah }] = await Promise.all([
    supabase.from("lab_pemeriksaan").select("id, nama, aktif").eq("id", pemeriksaanId).single(),
    supabase
      .from("lab_parameter")
      .select("id, nama, satuan, tipe, pilihan, pilihan_normal, min_l, max_l, min_p, max_p, urutan, aktif")
      .eq("pemeriksaan_id", pemeriksaanId)
      .eq("aktif", true)
      .order("urutan"),
  ]);
  if (!pem || !pem.aktif) return { pesan: "Pemeriksaan tidak ditemukan atau sudah nonaktif.", sukses: false };
  const parameter = (paramMentah ?? []) as unknown as ParameterLab[];
  const petaParam = new Map(parameter.map((p) => [p.id, p]));

  const baris = hasilMentah
    .map((h) => ({ parameter_id: h.parameter_id, nilai: String(h.nilai ?? "").trim() }))
    .filter((h) => h.nilai !== "");
  if (baris.length === 0) return { pesan: "Isi minimal satu hasil parameter.", sukses: false };

  for (const h of baris) {
    const p = petaParam.get(h.parameter_id);
    if (!p) return { pesan: "Ada parameter yang bukan bagian dari pemeriksaan ini.", sukses: false };
    if (p.tipe === "angka" && Number.isNaN(Number(h.nilai.replace(",", ".")))) {
      return { pesan: `Hasil "${p.nama}" harus berupa angka.`, sukses: false };
    }
    if (p.tipe === "pilihan" && !(p.pilihan ?? []).includes(h.nilai)) {
      return { pesan: `Hasil "${p.nama}" harus salah satu dari pilihan yang tersedia.`, sukses: false };
    }
  }

  const { data: laporan, error } = await supabase
    .from("lab_pustu_laporan")
    .insert({
      lokasi_id: lokasiId,
      pemeriksaan_id: pemeriksaanId,
      nama_pemeriksaan: pem.nama,
      no_rm_pustu: noRm || null,
      nama_pasien: nama,
      jenis_kelamin: jk,
      tanggal_lahir: lahir || null,
      tanggal_periksa: periksa,
      catatan: catatan || null,
      dicatat_oleh: pemanggil.id,
      dicatat_oleh_nama: pemanggil.nama_lengkap,
    })
    .select("id, no_laporan")
    .single();
  if (error || !laporan) {
    return {
      pesan: `Gagal simpan: ${error?.message ?? "tidak diketahui"}${error?.message?.includes("lab_pustu") ? ". Pastikan migrasi_tahap_50.sql sudah dijalankan." : ""}`,
      sukses: false,
    };
  }

  const { error: errHasil } = await supabase.from("lab_pustu_hasil").insert(
    baris.map((h) => {
      const p = petaParam.get(h.parameter_id)!;
      return {
        laporan_id: laporan.id,
        parameter_id: p.id,
        nama_parameter: p.nama,
        satuan: p.satuan,
        rujukan_teks: teksRujukan(p, jk) || null,
        nilai: h.nilai,
        flag: hitungFlag(p, jk, h.nilai),
        urutan: p.urutan,
      };
    }),
  );
  if (errHasil) {
    // Gagal di tengah jalan: bersihkan header yatim supaya tidak ada laporan tanpa hasil.
    try {
      await createAdminClient().from("lab_pustu_laporan").delete().eq("id", laporan.id);
    } catch {
      // abaikan, Lab tetap bisa mengembalikan laporan kosong
    }
    return { pesan: `Hasil gagal disimpan: ${errHasil.message}`, sukses: false };
  }

  segarkan();
  return { pesan: `Laporan ${laporan.no_laporan} terkirim ke Lab Induk.`, sukses: true };
}

// ---------------------------------------------------------------------------
// Stok BHP & reagen Pustu (laporan bulanan)
// ---------------------------------------------------------------------------

export async function simpanStokPustuAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const petugas = await ambilPetugasPustu();
  if (!petugas) {
    return { pesan: "Cuma petugas yang berlokasi di Pustu yang boleh mengisi stok Pustu.", sukses: false };
  }
  const { pemanggil, lokasiId } = petugas;

  const bulan = String(formData.get("bulan") ?? "").trim(); // YYYY-MM
  const nama = String(formData.get("nama_barang") ?? "").trim();
  const jenis = String(formData.get("jenis") ?? "bhp");
  const satuan = String(formData.get("satuan") ?? "").trim() || "pcs";
  const kadaluarsa = String(formData.get("tanggal_kadaluarsa") ?? "").trim();

  if (!/^\d{4}-\d{2}$/.test(bulan)) return { pesan: "Pilih bulan laporan.", sukses: false };
  const periode = `${bulan}-01`;
  if (!tanggalValid(periode)) return { pesan: "Bulan laporan tidak valid.", sukses: false };
  if (periode > hariIniWib()) return { pesan: "Bulan laporan tidak boleh di masa depan.", sukses: false };
  if (!nama) return { pesan: "Nama barang wajib diisi.", sukses: false };
  if (jenis !== "bhp" && jenis !== "reagen") return { pesan: "Jenis harus BHP atau reagen.", sukses: false };
  if (kadaluarsa && !tanggalValid(kadaluarsa)) return { pesan: "Tanggal kadaluarsa tidak valid.", sukses: false };

  const stokAwal = angka(formData.get("stok_awal"));
  const masuk = angka(formData.get("masuk"));
  const dipakai = angka(formData.get("dipakai"));
  const minimum = angka(formData.get("stok_minimum"));
  if ([stokAwal, masuk, dipakai, minimum].some((n) => Number.isNaN(n) || n < 0)) {
    return { pesan: "Stok awal, masuk, dipakai, dan minimum harus angka 0 atau lebih.", sukses: false };
  }
  if (dipakai > stokAwal + masuk) {
    return { pesan: "Jumlah dipakai melebihi stok awal + masuk. Cek lagi angkanya.", sukses: false };
  }

  const supabase = createClient();
  const { error } = await supabase.from("lab_pustu_stok").upsert(
    {
      lokasi_id: lokasiId,
      periode,
      nama_barang: nama,
      jenis,
      satuan,
      stok_awal: stokAwal,
      masuk,
      dipakai,
      stok_minimum: minimum,
      tanggal_kadaluarsa: kadaluarsa || null,
      catatan: String(formData.get("catatan") ?? "").trim() || null,
      dicatat_oleh: pemanggil.id,
      dicatat_oleh_nama: pemanggil.nama_lengkap,
    },
    { onConflict: "lokasi_id,periode,nama_barang" },
  );
  if (error) {
    return {
      pesan: `Gagal simpan: ${error.message}${error.message.includes("lab_pustu") ? ". Pastikan migrasi_tahap_50.sql sudah dijalankan." : ""}`,
      sukses: false,
    };
  }
  segarkan();
  return { pesan: `Stok ${nama} periode ${bulan} tersimpan.`, sukses: true };
}

// ---------------------------------------------------------------------------
// Lab Induk: verifikasi laporan Pustu
// ---------------------------------------------------------------------------

export async function verifikasiLaporanPustuAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh memverifikasi laporan Pustu.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  const keputusan = String(formData.get("keputusan") ?? "");
  const catatan = String(formData.get("catatan_verifikasi") ?? "").trim();
  if (!id) return { pesan: "Laporan tidak ditemukan.", sukses: false };
  if (keputusan !== "diverifikasi" && keputusan !== "dikembalikan") {
    return { pesan: "Keputusan tidak dikenal.", sukses: false };
  }
  if (keputusan === "dikembalikan" && !catatan) {
    return { pesan: "Tulis alasan pengembalian supaya Pustu tahu apa yang diperbaiki.", sukses: false };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("lab_pustu_laporan")
    .update({
      status: keputusan,
      catatan_verifikasi: catatan || null,
      diverifikasi_oleh: pemanggil.id,
      diverifikasi_oleh_nama: pemanggil.nama_lengkap,
    })
    .eq("id", id)
    .eq("status", "terkirim")
    .select("id");
  if (error) return { pesan: `Gagal: ${error.message}`, sukses: false };
  if (!data || data.length === 0) {
    return { pesan: "Laporan sudah diproses sebelumnya atau tidak ditemukan.", sukses: false };
  }
  segarkan();
  return { pesan: keputusan === "diverifikasi" ? "Laporan diverifikasi." : "Laporan dikembalikan ke Pustu.", sukses: true };
}

// ---------------------------------------------------------------------------
// Lab Induk: pemeriksaan yang diizinkan per Pustu
// ---------------------------------------------------------------------------

export async function simpanIzinPustuAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh mengatur izin pemeriksaan Pustu.", sukses: false };
  }
  const lokasiId = String(formData.get("lokasi_id") ?? "");
  if (!lokasiId) return { pesan: "Pustu tidak dikenal.", sukses: false };
  const dipilih = Array.from(new Set(formData.getAll("pemeriksaan_id").map(String).filter(Boolean)));

  const supabase = createClient();
  const { data: lokasi } = await supabase.from("lokasi").select("id, nama, tipe").eq("id", lokasiId).single();
  if (!lokasi || lokasi.tipe !== "pustu") return { pesan: "Lokasi bukan Pustu.", sukses: false };

  const { data: ada } = await supabase.from("lab_pustu_izin").select("id, pemeriksaan_id").eq("lokasi_id", lokasiId);
  const adaIds = new Set((ada ?? []).map((a) => a.pemeriksaan_id as string));
  const hapus = (ada ?? []).filter((a) => !dipilih.includes(a.pemeriksaan_id as string)).map((a) => a.id as string);
  const tambah = dipilih.filter((p) => !adaIds.has(p));

  if (tambah.length > 0) {
    const { error } = await supabase
      .from("lab_pustu_izin")
      .insert(tambah.map((p) => ({ lokasi_id: lokasiId, pemeriksaan_id: p })));
    if (error) return { pesan: `Gagal simpan: ${error.message}`, sukses: false };
  }
  if (hapus.length > 0) {
    const { error } = await supabase.from("lab_pustu_izin").delete().in("id", hapus);
    if (error) return { pesan: `Gagal simpan: ${error.message}`, sukses: false };
  }
  segarkan();
  return { pesan: `Izin pemeriksaan ${lokasi.nama} tersimpan (${dipilih.length} pemeriksaan).`, sukses: true };
}
