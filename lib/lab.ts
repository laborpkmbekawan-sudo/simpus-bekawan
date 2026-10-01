// Helper modul Laboratorium: label status, warna, dan perhitungan penanda
// (rendah/tinggi/abnormal) terhadap nilai rujukan. Perhitungan penanda
// dipakai di server action -- klien cuma menampilkan, tidak dipercaya.

import { geserHari, selisihHari } from "@/lib/format";

export type ParameterLab = {
  id: string;
  nama: string;
  satuan: string | null;
  tipe: "angka" | "pilihan" | "teks";
  pilihan: string[] | null;
  pilihan_normal: string | null;
  min_l: number | null;
  max_l: number | null;
  min_p: number | null;
  max_p: number | null;
  kritis_min?: number | null;
  kritis_max?: number | null;
  urutan: number;
  aktif: boolean;
};

export type FlagLab = "normal" | "rendah" | "tinggi" | "abnormal" | null;

export const PERAN_KLINIS_LAB = ["dokter", "dokter_gigi", "perawat", "bidan"];
export const PERAN_LAB = ["admin", "laboratorium"];
export const PERAN_MINTA_LAB = ["admin", "dokter", "dokter_gigi", "perawat", "bidan", "laboratorium"];

export const KATEGORI_LAB = [
  "Hematologi",
  "Kimia Klinik",
  "Urinalisis",
  "Imunoserologi",
  "Parasitologi",
  "Mikrobiologi",
  "Imunohematologi",
  "Lainnya",
];

export const ALASAN_TOLAK_SAMPEL = [
  "Sampel hemolisis",
  "Volume sampel kurang",
  "Sampel lipemik / ikterik",
  "Wadah atau tabung tidak sesuai",
  "Identitas / label tidak sesuai",
  "Sampel terlalu lama atau rusak",
  "Lainnya",
];

export const STATUS_QC: Record<string, string> = {
  dalam_kendali: "Dalam kendali",
  peringatan: "Peringatan (>2 SD)",
  ditolak: "Ditolak (>3 SD)",
};

export const WARNA_STATUS_QC: Record<string, string> = {
  dalam_kendali: "bg-teal-700/10 text-teal-700",
  peringatan: "bg-clay-600/10 text-clay-700",
  ditolak: "bg-red-600 text-white",
};

export const STATUS_RUJUKAN_LAB: Record<string, string> = {
  dikirim: "Dikirim, menunggu hasil",
  hasil_diterima: "Hasil diterima",
  dibatalkan: "Dibatalkan",
};

export const WARNA_STATUS_RUJUKAN_LAB: Record<string, string> = {
  dikirim: "bg-clay-600/10 text-clay-700",
  hasil_diterima: "bg-teal-700/10 text-teal-700",
  dibatalkan: "bg-red-500/10 text-red-600",
};

export const STATUS_LAB: Record<string, string> = {
  diminta: "Menunggu Lab",
  sampel_diterima: "Sampel diterima",
  proses: "Sedang diproses",
  selesai: "Hasil selesai",
  dibatalkan: "Dibatalkan",
};

export const WARNA_STATUS_LAB: Record<string, string> = {
  diminta: "bg-clay-600/10 text-clay-700",
  sampel_diterima: "bg-ink/5 text-ink/70",
  proses: "bg-ink/5 text-ink/70",
  selesai: "bg-teal-700/10 text-teal-700",
  dibatalkan: "bg-red-500/10 text-red-600",
};

// Urutan tahap buat pelacak progres di sisi klaster.
export const TAHAP_LAB = ["diminta", "sampel_diterima", "proses", "selesai"] as const;

export const LABEL_FLAG: Record<string, string> = {
  normal: "Normal",
  rendah: "Rendah",
  tinggi: "Tinggi",
  abnormal: "Abnormal",
};

export const WARNA_FLAG: Record<string, string> = {
  normal: "text-ink/50",
  rendah: "font-bold text-clay-700",
  tinggi: "font-bold text-red-600",
  abnormal: "font-bold text-red-600",
};

function angkaRapi(n: number) {
  return Number.isInteger(n) ? n.toLocaleString("id-ID") : String(n).replace(".", ",");
}

// Batas rujukan sesuai jenis kelamin. Perempuan yang min_p/max_p-nya kosong
// pakai batas umum (min_l/max_l).
export function batasRujukan(p: ParameterLab, jenisKelamin: string | null) {
  const perempuan = jenisKelamin === "P";
  const min = perempuan && (p.min_p != null || p.max_p != null) ? p.min_p : p.min_l;
  const max = perempuan && (p.min_p != null || p.max_p != null) ? p.max_p : p.max_l;
  return { min: min != null ? Number(min) : null, max: max != null ? Number(max) : null };
}

export function teksRujukan(p: ParameterLab, jenisKelamin: string | null): string {
  if (p.tipe === "pilihan") return p.pilihan_normal ? p.pilihan_normal : "";
  if (p.tipe === "teks") return "";
  const { min, max } = batasRujukan(p, jenisKelamin);
  if (min != null && max != null) return `${angkaRapi(min)} – ${angkaRapi(max)}`;
  if (max != null) return `< ${angkaRapi(max)}`;
  if (min != null) return `> ${angkaRapi(min)}`;
  return "";
}

export function hitungFlag(p: ParameterLab, jenisKelamin: string | null, nilai: string): FlagLab {
  const v = nilai.trim();
  if (!v) return null;
  if (p.tipe === "teks") return null;
  if (p.tipe === "pilihan") {
    if (!p.pilihan_normal) return null;
    return v === p.pilihan_normal ? "normal" : "abnormal";
  }
  const angka = Number(v.replace(",", "."));
  if (Number.isNaN(angka)) return null;
  const { min, max } = batasRujukan(p, jenisKelamin);
  if (min != null && angka < min) return "rendah";
  if (max != null && angka > max) return "tinggi";
  return "normal";
}

// Nilai kritis: angka di luar batas kritis parameter (berlaku umum L/P).
export function hitungKritis(p: ParameterLab, nilai: string): boolean {
  if (p.tipe !== "angka") return false;
  const angka = Number(nilai.trim().replace(",", "."));
  if (Number.isNaN(angka) || nilai.trim() === "") return false;
  if (p.kritis_min != null && angka < Number(p.kritis_min)) return true;
  if (p.kritis_max != null && angka > Number(p.kritis_max)) return true;
  return false;
}

export function teksKritis(p: ParameterLab): string {
  const min = p.kritis_min != null ? Number(p.kritis_min) : null;
  const max = p.kritis_max != null ? Number(p.kritis_max) : null;
  const f = (n: number) => String(n).replace(".", ",");
  if (min != null && max != null) return `< ${f(min)} atau > ${f(max)}`;
  if (min != null) return `< ${f(min)}`;
  if (max != null) return `> ${f(max)}`;
  return "";
}

export function umurTahun(tanggalLahir: string | null): string {
  if (!tanggalLahir) return "—";
  const lahir = new Date(tanggalLahir);
  const now = new Date();
  let u = now.getFullYear() - lahir.getFullYear();
  if (now.getMonth() < lahir.getMonth() || (now.getMonth() === lahir.getMonth() && now.getDate() < lahir.getDate())) u -= 1;
  return `${u} tahun`;
}


// ---------------------------------------------------------------------------
// FITUR 11 -- Alat lab, kalibrasi & pemeliharaan
// ---------------------------------------------------------------------------

export const KONDISI_ALAT: Record<string, string> = {
  baik: "Baik",
  perlu_perbaikan: "Perlu perbaikan",
  rusak: "Rusak",
  nonaktif: "Nonaktif",
};

export const WARNA_KONDISI_ALAT: Record<string, string> = {
  baik: "bg-teal-700/10 text-teal-700",
  perlu_perbaikan: "bg-clay-600/10 text-clay-700",
  rusak: "bg-red-600 text-white",
  nonaktif: "bg-ink/5 text-ink/50",
};

export const JENIS_LOG_ALAT: Record<string, string> = {
  kalibrasi: "Kalibrasi",
  pemeliharaan: "Pemeliharaan rutin",
  perbaikan: "Perbaikan",
};

export const HASIL_LOG_ALAT: Record<string, string> = {
  baik: "Baik / sesuai",
  perlu_tindak_lanjut: "Perlu tindak lanjut",
  gagal: "Gagal / tidak sesuai",
};

export const WARNA_HASIL_LOG_ALAT: Record<string, string> = {
  baik: "bg-teal-700/10 text-teal-700",
  perlu_tindak_lanjut: "bg-clay-600/10 text-clay-700",
  gagal: "bg-red-600 text-white",
};

export const AMBANG_SEGERA_ALAT_HARI = 14;

export type StatusJadwal = "tidak_dijadwalkan" | "belum_pernah" | "terlambat" | "segera" | "aman";

// Status jadwal kalibrasi/pemeliharaan. `berikutnya` dihitung database
// (terakhir + interval); di sini cuma dibandingkan dengan hari ini (WIB).
export function statusJadwal(
  interval: number | null,
  berikutnya: string | null,
  hariIni: string,
): { status: StatusJadwal; sisaHari: number | null } {
  if (!interval) return { status: "tidak_dijadwalkan", sisaHari: null };
  if (!berikutnya) return { status: "belum_pernah", sisaHari: null };
  const sisa = selisihHari(hariIni, berikutnya);
  if (sisa < 0) return { status: "terlambat", sisaHari: sisa };
  if (sisa <= AMBANG_SEGERA_ALAT_HARI) return { status: "segera", sisaHari: sisa };
  return { status: "aman", sisaHari: sisa };
}

export const WARNA_STATUS_JADWAL: Record<StatusJadwal, string> = {
  tidak_dijadwalkan: "bg-ink/5 text-ink/50",
  belum_pernah: "bg-clay-600/10 text-clay-700",
  terlambat: "bg-red-600 text-white",
  segera: "bg-clay-600/10 text-clay-700",
  aman: "bg-teal-700/10 text-teal-700",
};

// ---------------------------------------------------------------------------
// FITUR 12 -- Lot reagen & kadaluarsa
// ---------------------------------------------------------------------------

export const STATUS_LOT: Record<string, string> = {
  tersimpan: "Tersimpan (belum dibuka)",
  dipakai: "Sedang dipakai",
  habis: "Habis",
  dibuang: "Dibuang",
};

export const WARNA_STATUS_LOT: Record<string, string> = {
  tersimpan: "bg-sand-100 text-ink/70",
  dipakai: "bg-teal-700/10 text-teal-700",
  habis: "bg-ink/5 text-ink/50",
  dibuang: "bg-ink/5 text-ink/50",
};

export const AMBANG_KADALUARSA_HARI = 30;

export type LotKadaluarsa = {
  tanggal_kadaluarsa: string;
  stabilitas_hari: number | null;
  tanggal_dibuka: string | null;
};

// Kadaluarsa efektif = yang lebih awal antara kadaluarsa kemasan dan
// (tanggal dibuka + masa stabilitas setelah dibuka).
export function kadaluarsaEfektif(l: LotKadaluarsa): { tanggal: string; olehStabilitas: boolean } {
  if (l.stabilitas_hari && l.tanggal_dibuka) {
    const habisStabil = geserHari(l.tanggal_dibuka, l.stabilitas_hari);
    if (habisStabil < l.tanggal_kadaluarsa) return { tanggal: habisStabil, olehStabilitas: true };
  }
  return { tanggal: l.tanggal_kadaluarsa, olehStabilitas: false };
}

export function statusKadaluarsa(
  tanggal: string,
  hariIni: string,
): { status: "kadaluarsa" | "segera" | "aman"; sisaHari: number } {
  const sisa = selisihHari(hariIni, tanggal);
  if (sisa < 0) return { status: "kadaluarsa", sisaHari: sisa };
  if (sisa <= AMBANG_KADALUARSA_HARI) return { status: "segera", sisaHari: sisa };
  return { status: "aman", sisaHari: sisa };
}

export const WARNA_STATUS_KADALUARSA: Record<"kadaluarsa" | "segera" | "aman", string> = {
  kadaluarsa: "bg-red-600 text-white",
  segera: "bg-clay-600/10 text-clay-700",
  aman: "bg-teal-700/10 text-teal-700",
};
