// Helper format & waktu untuk laporan. Puskesmas Bekawan memakai WIB (UTC+7),
// sedangkan server (Vercel) berjalan di UTC, jadi batas hari untuk kolom
// timestamp harus dihitung eksplisit dalam WIB.

const WIB_MS = 7 * 3600 * 1000;

export function hariIniWib(): string {
  return new Date(Date.now() + WIB_MS).toISOString().slice(0, 10);
}

export function tanggalValid(nilai: string | undefined | null): nilai is string {
  return !!nilai && /^\d{4}-\d{2}-\d{2}$/.test(nilai) && !Number.isNaN(Date.parse(`${nilai}T00:00:00Z`));
}

// Awal dan akhir hari (WIB) sebagai ISO UTC, untuk filter kolom timestamptz.
export function awalHariWib(tanggal: string): string {
  return new Date(`${tanggal}T00:00:00+07:00`).toISOString();
}

export function akhirHariWib(tanggal: string): string {
  return new Date(`${tanggal}T23:59:59.999+07:00`).toISOString();
}

export function geserHari(tanggal: string, selisih: number): string {
  const d = new Date(`${tanggal}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + selisih);
  return d.toISOString().slice(0, 10);
}

export function selisihHari(dari: string, sampai: string): number {
  return Math.round((Date.parse(`${sampai}T00:00:00Z`) - Date.parse(`${dari}T00:00:00Z`)) / 86_400_000);
}

export function rupiah(nilai: number): string {
  return `Rp ${Math.round(nilai).toLocaleString("id-ID")}`;
}

export function waktuWib(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function tanggalPanjang(tanggal: string): string {
  return new Date(`${tanggal}T00:00:00Z`).toLocaleDateString("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
