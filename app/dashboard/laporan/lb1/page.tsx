import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { geserHari, hariIniWib, tanggalPanjang, tanggalValid } from "@/lib/format";
import TombolCetak from "./tombol-cetak";
import { Fragment } from "react";

const PERAN_LAPORAN = ["admin", "kapus", "bendahara_bok"];

const KELOMPOK_UMUR = [
  { label: "0-4 th", min: 0, maks: 4 },
  { label: "5-14 th", min: 5, maks: 14 },
  { label: "15-19 th", min: 15, maks: 19 },
  { label: "20-59 th", min: 20, maks: 59 },
  { label: "60+ th", min: 60, maks: 999 },
];

function umurTahun(tanggalLahir: string | null, tanggalKunjungan: string): number | null {
  if (!tanggalLahir) return null;
  const lahir = new Date(tanggalLahir);
  const kunj = new Date(tanggalKunjungan);
  let umur = kunj.getFullYear() - lahir.getFullYear();
  const belumUlangTahun =
    kunj.getMonth() < lahir.getMonth() ||
    (kunj.getMonth() === lahir.getMonth() && kunj.getDate() < lahir.getDate());
  if (belumUlangTahun) umur--;
  return umur;
}

function indeksKelompokUmur(umur: number | null): number | null {
  if (umur === null) return null;
  const i = KELOMPOK_UMUR.findIndex((k) => umur >= k.min && umur <= k.maks);
  return i === -1 ? null : i;
}

type BarisRekap = {
  kode: string;
  diagnosis: string;
  perKelompok: { L: number; P: number }[];
  total: number;
};

export default async function LaporanLb1({
  searchParams,
}: {
  searchParams: { dari?: string; sampai?: string };
}) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  if (!PERAN_LAPORAN.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kepala puskesmas, dan bendahara BOK.
      </div>
    );
  }

  const hariIni = hariIniWib();
  const bulanIniMulai = `${hariIni.slice(0, 8)}01`;
  let dari = tanggalValid(searchParams.dari) ? searchParams.dari : bulanIniMulai;
  let sampai = tanggalValid(searchParams.sampai) ? searchParams.sampai : hariIni;
  if (dari > sampai) [dari, sampai] = [sampai, dari];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("kunjungan")
    .select(
      "tanggal, pasien:pasien_id (tanggal_lahir, jenis_kelamin), catatan_klinis (kode_icd10, diagnosis)"
    )
    .gte("tanggal", dari)
    .lte("tanggal", sampai)
    .order("tanggal", { ascending: true })
    .limit(5000);

  if (error) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Gagal memuat data: {error.message}
      </div>
    );
  }

  type Baris = {
    tanggal: string;
    pasien: { tanggal_lahir: string | null; jenis_kelamin: "L" | "P" | null } | { tanggal_lahir: string | null; jenis_kelamin: "L" | "P" | null }[] | null;
    catatan_klinis: { kode_icd10: string | null; diagnosis: string | null } | { kode_icd10: string | null; diagnosis: string | null }[] | null;
  };

  const rekap = new Map<string, BarisRekap>();
  let tanpaIcd10 = 0;

  for (const baris of (data as unknown as Baris[]) ?? []) {
    const p = Array.isArray(baris.pasien) ? baris.pasien[0] : baris.pasien;
    const c = Array.isArray(baris.catatan_klinis) ? baris.catatan_klinis[0] : baris.catatan_klinis;
    if (!c || !c.kode_icd10) {
      tanpaIcd10++;
      continue;
    }

    const kode = c.kode_icd10;
    const iUmur = indeksKelompokUmur(umurTahun(p?.tanggal_lahir ?? null, baris.tanggal));
    const sex = p?.jenis_kelamin === "P" ? "P" : "L";

    if (!rekap.has(kode)) {
      rekap.set(kode, {
        kode,
        diagnosis: c.diagnosis ?? "",
        perKelompok: KELOMPOK_UMUR.map(() => ({ L: 0, P: 0 })),
        total: 0,
      });
    }
    const r = rekap.get(kode)!;
    if (iUmur !== null) r.perKelompok[iUmur][sex]++;
    r.total++;
  }

  const daftarRekap = [...rekap.values()].sort((a, b) => b.total - a.total);
  const grandTotal = daftarRekap.reduce((a, r) => a + r.total, 0);

  const pintasan = [
    { label: "Bulan ini", dari: bulanIniMulai, sampai: hariIni },
    { label: "30 hari terakhir", dari: geserHari(hariIni, -29), sampai: hariIni },
  ];
  const periodeTeks = `${tanggalPanjang(dari)} s.d. ${tanggalPanjang(sampai)}`;

  return (
    <div className="space-y-6">
      <div className="hidden text-center print:block">
        <p className="text-base font-bold">UPTD PUSKESMAS BEKAWAN</p>
        <p className="text-sm">Rekap Data Kesakitan per Kode ICD-10</p>
        <p className="text-sm">Periode {periodeTeks}</p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Laporan LB1 (Data Kesakitan)</h1>
          <p className="mt-1.5 text-sm text-ink/60">
            Rekap kunjungan per kode ICD-10 yang diisi dokter/perawat/bidan di catatan klinis.
          </p>
        </div>
        <TombolCetak />
      </div>

      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-4 py-3 text-xs leading-relaxed text-clay-700 print:hidden">
        Ini <strong>bukan</strong> format LB1 resmi Kemenkes. Direkap apa adanya berdasar kode ICD-10 yang
        diketik petugas (belum dipetakan ke ~50 kategori resmi), dan kelompok umur di sini disederhanakan
        (5 kelompok), bukan 11 kelompok baku LB1. Pakai sebagai bahan awal, cek ulang sebelum dipakai buat
        pelaporan resmi.
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        {pintasan.map((p) => (
          <a
            key={p.label}
            href={`?dari=${p.dari}&sampai=${p.sampai}`}
            className="rounded-sm border border-sand-100 bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-sand-50"
          >
            {p.label}
          </a>
        ))}
      </div>

      <form className="flex flex-wrap items-end gap-3 print:hidden">
        <div className="space-y-1.5">
          <label htmlFor="dari" className="text-sm font-bold text-ink/80">Tanggal mulai</label>
          <input id="dari" name="dari" type="date" defaultValue={dari} className="rounded-sm border border-sand-100 px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="sampai" className="text-sm font-bold text-ink/80">Tanggal akhir</label>
          <input id="sampai" name="sampai" type="date" defaultValue={sampai} className="rounded-sm border border-sand-100 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-sm bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900">
          Tampilkan
        </button>
      </form>

      <p className="text-xs text-ink/45 print:hidden">
        {tanpaIcd10} kunjungan pada periode ini belum punya kode ICD-10 (gak masuk rekap).
      </p>

      <div className="overflow-x-auto rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-sand-100 bg-sand-50 uppercase tracking-wide text-ink/45">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Kode</th>
              <th className="px-3 py-2.5 font-semibold">Diagnosis</th>
              {KELOMPOK_UMUR.map((k) => (
                <th key={k.label} className="px-2 py-2.5 text-center font-semibold" colSpan={2}>
                  {k.label}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center font-semibold">Total</th>
            </tr>
            <tr>
              <th className="px-3 py-1"></th>
              <th className="px-3 py-1"></th>
              {KELOMPOK_UMUR.map((k) => (
                <Fragment key={k.label}>
                  <th className="px-1.5 py-1 text-center font-normal">L</th>
                  <th className="px-1.5 py-1 text-center font-normal">P</th>
                </Fragment>
              ))}
              <th className="px-3 py-1"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {daftarRekap.map((r) => (
              <tr key={r.kode}>
                <td className="whitespace-nowrap px-3 py-2 font-semibold text-ink">{r.kode}</td>
                <td className="px-3 py-2 text-ink/70">{r.diagnosis || "—"}</td>
                {r.perKelompok.map((c, i) => (
                  <Fragment key={i}>
                    <td className="px-1.5 py-2 text-center text-ink/70">{c.L || ""}</td>
                    <td className="px-1.5 py-2 text-center text-ink/70">{c.P || ""}</td>
                  </Fragment>
                ))}
                <td className="px-3 py-2 text-center font-bold text-ink">{r.total}</td>
              </tr>
            ))}
            {daftarRekap.length === 0 && (
              <tr>
                <td colSpan={KELOMPOK_UMUR.length * 2 + 3} className="px-3 py-8 text-center text-ink/45">
                  Belum ada catatan klinis berkode ICD-10 di periode ini.
                </td>
              </tr>
            )}
          </tbody>
          {daftarRekap.length > 0 && (
            <tfoot className="border-t border-sand-100 bg-sand-50 font-bold text-ink">
              <tr>
                <td className="px-3 py-2.5" colSpan={2}>Grand Total</td>
                <td className="px-3 py-2.5 text-center" colSpan={KELOMPOK_UMUR.length * 2}></td>
                <td className="px-3 py-2.5 text-center">{grandTotal}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
