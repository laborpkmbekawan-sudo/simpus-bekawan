import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import {
  geserHari,
  hariIniWib,
  selisihHari,
  tanggalPanjang,
  tanggalValid,
} from "@/lib/format";
import TombolCetak from "./tombol-cetak";

const PERAN_LAPORAN = ["admin", "kapus", "bendahara_bok"];
const UKURAN_HALAMAN = 1000; // batas baris per permintaan Supabase
const MAKS_BARIS = 5000;
const MAKS_RENTANG_HARI = 366;

type BarisKunjungan = {
  id: string;
  tanggal: string;
  jenis_kunjungan: "baru" | "lama" | "kontrol";
  status: string;
  klaster_tujuan_id: string;
  dibuat_pada: string;
  dipanggil_pada: string | null;
  selesai_pada: string | null;
};

function menitAntara(a: string, b: string): number {
  return (Date.parse(b) - Date.parse(a)) / 60_000;
}

function formatMenit(menit: number | null): string {
  if (menit === null || !Number.isFinite(menit)) return "—";
  if (menit < 60) return `${Math.round(menit)} menit`;
  const jam = Math.floor(menit / 60);
  const sisa = Math.round(menit % 60);
  return `${jam} jam${sisa > 0 ? ` ${sisa} menit` : ""}`;
}

export default async function LaporanPelayanan({
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

  // ---- periode ----
  const hariIni = hariIniWib();
  let dari = tanggalValid(searchParams.dari) ? searchParams.dari : geserHari(hariIni, -6);
  let sampai = tanggalValid(searchParams.sampai) ? searchParams.sampai : hariIni;
  if (dari > sampai) [dari, sampai] = [sampai, dari];
  let catatanRentang: string | null = null;
  if (selisihHari(dari, sampai) > MAKS_RENTANG_HARI) {
    dari = geserHari(sampai, -MAKS_RENTANG_HARI);
    catatanRentang = `Rentang dibatasi maksimal ${MAKS_RENTANG_HARI} hari, jadi dimulai dari ${tanggalPanjang(dari)}.`;
  }

  const supabase = createClient();

  const [{ data: klaster }, ...halamanKunjungan] = await Promise.all([
    supabase.from("klaster").select("id, nama, urutan").order("urutan", { ascending: true }),
    ...Array.from({ length: Math.ceil(MAKS_BARIS / UKURAN_HALAMAN) }, (_, i) =>
      supabase
        .from("kunjungan")
        .select("id, tanggal, jenis_kunjungan, status, klaster_tujuan_id, dibuat_pada, dipanggil_pada, selesai_pada")
        .gte("tanggal", dari)
        .lte("tanggal", sampai)
        .order("tanggal", { ascending: true })
        .order("id", { ascending: true })
        .range(i * UKURAN_HALAMAN, i * UKURAN_HALAMAN + UKURAN_HALAMAN - 1)
    ),
  ]);

  const semua: BarisKunjungan[] = [];
  let galat: string | null = null;
  let terpotong = false;
  for (const h of halamanKunjungan) {
    if (h.error) {
      galat = h.error.message;
      break;
    }
    semua.push(...(h.data as BarisKunjungan[]));
    if (h.data.length < UKURAN_HALAMAN) break;
    if (semua.length >= MAKS_BARIS) {
      terpotong = true;
      break;
    }
  }

  const namaKlaster = new Map((klaster ?? []).map((k) => [k.id, k.nama]));

  // ---- ringkasan ----
  const perJenis = { baru: 0, lama: 0, kontrol: 0 };
  for (const k of semua) perJenis[k.jenis_kunjungan]++;

  const waktuTunggu = semua
    .filter((k) => k.dipanggil_pada)
    .map((k) => menitAntara(k.dibuat_pada, k.dipanggil_pada!));
  const rataTunggu = waktuTunggu.length > 0 ? waktuTunggu.reduce((a, b) => a + b, 0) / waktuTunggu.length : null;

  const waktuLayanan = semua
    .filter((k) => k.dipanggil_pada && k.selesai_pada)
    .map((k) => menitAntara(k.dipanggil_pada!, k.selesai_pada!));
  const rataLayanan = waktuLayanan.length > 0 ? waktuLayanan.reduce((a, b) => a + b, 0) / waktuLayanan.length : null;

  // ---- rekap harian ----
  const perTanggal = new Map<string, { total: number; baru: number; lama: number; kontrol: number }>();
  for (const k of semua) {
    const r = perTanggal.get(k.tanggal) ?? { total: 0, baru: 0, lama: 0, kontrol: 0 };
    r.total++;
    r[k.jenis_kunjungan]++;
    perTanggal.set(k.tanggal, r);
  }
  const rekapHarian = [...perTanggal.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)); // terbaru dulu

  // ---- rekap per klaster ----
  const perKlaster = new Map<string, { total: number; baru: number; lama: number; kontrol: number }>();
  for (const k of semua) {
    const r = perKlaster.get(k.klaster_tujuan_id) ?? { total: 0, baru: 0, lama: 0, kontrol: 0 };
    r.total++;
    r[k.jenis_kunjungan]++;
    perKlaster.set(k.klaster_tujuan_id, r);
  }
  const rekapKlaster = (klaster ?? [])
    .map((kl) => ({ nama: kl.nama, ...(perKlaster.get(kl.id) ?? { total: 0, baru: 0, lama: 0, kontrol: 0 }) }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  const hariIniStr = hariIniWib();
  const bulanIniMulai = `${hariIniStr.slice(0, 8)}01`;
  const pintasan = [
    { label: "Hari ini", dari: hariIniStr, sampai: hariIniStr },
    { label: "7 hari terakhir", dari: geserHari(hariIniStr, -6), sampai: hariIniStr },
    { label: "Bulan ini", dari: bulanIniMulai, sampai: hariIniStr },
  ];

  const kartu = [
    { label: "Total Kunjungan", nilai: String(semua.length) },
    { label: "Pasien Baru", nilai: String(perJenis.baru) },
    { label: "Pasien Lama", nilai: String(perJenis.lama) },
    { label: "Kontrol", nilai: String(perJenis.kontrol) },
    { label: "Rata-rata Tunggu Dipanggil", nilai: formatMenit(rataTunggu) },
    { label: "Rata-rata Lama Dilayani", nilai: formatMenit(rataLayanan) },
  ];

  const periodeTeks = dari === sampai ? tanggalPanjang(dari) : `${tanggalPanjang(dari)} s.d. ${tanggalPanjang(sampai)}`;

  return (
    <div className="space-y-6">
      <div className="hidden text-center print:block">
        <p className="text-base font-bold">UPTD PUSKESMAS BEKAWAN</p>
        <p className="text-sm">Laporan Pelayanan</p>
        <p className="text-sm">Periode {periodeTeks}</p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Laporan Pelayanan</h1>
          <p className="mt-1.5 text-sm text-ink/60">
            Rekap kunjungan harian, per klaster, dan rata-rata waktu tunggu.
          </p>
        </div>
        <TombolCetak />
      </div>

      <div className="space-y-2 print:hidden">
        <form className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="dari" className="text-sm font-bold text-ink/80">Tanggal mulai</label>
            <input
              id="dari"
              name="dari"
              type="date"
              defaultValue={dari}
              max={hariIniStr}
              className="rounded-sm border border-sand-100 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sampai" className="text-sm font-bold text-ink/80">Tanggal akhir</label>
            <input
              id="sampai"
              name="sampai"
              type="date"
              defaultValue={sampai}
              max={hariIniStr}
              className="rounded-sm border border-sand-100 bg-white px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-sm bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900"
          >
            Tampilkan
          </button>
        </form>
        <div className="flex flex-wrap gap-3 text-xs">
          {pintasan.map((p) => (
            <Link
              key={p.label}
              href={`/dashboard/laporan/pelayanan?dari=${p.dari}&sampai=${p.sampai}`}
              className="font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {catatanRentang && (
        <p className="rounded-sm bg-clay-600/10 px-3.5 py-2.5 text-sm text-clay-700">{catatanRentang}</p>
      )}
      {galat && (
        <p role="alert" className="rounded-sm bg-clay-600/10 px-3.5 py-2.5 text-sm text-clay-700">
          Gagal mengambil data kunjungan: {galat}
        </p>
      )}
      {terpotong && (
        <p className="text-xs text-ink/50">
          Data melebihi {MAKS_BARIS} kunjungan, laporan ini hanya mencakup {MAKS_BARIS} kunjungan pertama.
          Persempit rentang tanggal untuk hasil yang lengkap.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kartu.map((k) => (
          <div key={k.label} className="rounded-card border border-sand-100 bg-white p-4">
            <p className="text-xs font-medium text-ink/50">{k.label}</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{k.nilai}</p>
          </div>
        ))}
      </div>
      <p className="-mt-3 text-xs text-ink/50 print:hidden">
        Waktu tunggu dan lama dilayani dihitung dari kunjungan yang statusnya sudah berubah lewat halaman Antrian /
        Pelayanan. Kunjungan yang belum pernah dipanggil tidak ikut dihitung.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">Rekap per Klaster</p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-4 py-2.5 font-medium">Klaster</th>
                <th className="px-4 py-2.5 text-right font-medium">Baru</th>
                <th className="px-4 py-2.5 text-right font-medium">Lama</th>
                <th className="px-4 py-2.5 text-right font-medium">Kontrol</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rekapKlaster.map((r) => (
                <tr key={r.nama} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-2.5 text-ink">{r.nama}</td>
                  <td className="px-4 py-2.5 text-right text-ink/70">{r.baru}</td>
                  <td className="px-4 py-2.5 text-right text-ink/70">{r.lama}</td>
                  <td className="px-4 py-2.5 text-right text-ink/70">{r.kontrol}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-ink">{r.total}</td>
                </tr>
              ))}
              {rekapKlaster.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-ink/45">
                    Belum ada kunjungan pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">Rekap Harian</p>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                  <th className="px-4 py-2.5 font-medium">Tanggal</th>
                  <th className="px-4 py-2.5 text-right font-medium">Baru</th>
                  <th className="px-4 py-2.5 text-right font-medium">Lama</th>
                  <th className="px-4 py-2.5 text-right font-medium">Kontrol</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {rekapHarian.map(([tanggal, r]) => (
                  <tr key={tanggal} className="border-b border-sand-100/70 last:border-0">
                    <td className="px-4 py-2.5 text-ink">{tanggalPanjang(tanggal)}</td>
                    <td className="px-4 py-2.5 text-right text-ink/70">{r.baru}</td>
                    <td className="px-4 py-2.5 text-right text-ink/70">{r.lama}</td>
                    <td className="px-4 py-2.5 text-right text-ink/70">{r.kontrol}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-ink">{r.total}</td>
                  </tr>
                ))}
                {rekapHarian.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-ink/45">
                      Belum ada kunjungan pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
