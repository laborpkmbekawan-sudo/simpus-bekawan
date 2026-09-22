import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import {
  akhirHariWib,
  awalHariWib,
  geserHari,
  hariIniWib,
  selisihHari,
  tanggalPanjang,
  tanggalValid,
  waktuWib,
} from "@/lib/format";
import TombolCetak from "./tombol-cetak";

const PERAN_LAPORAN = ["admin", "kapus"];
const UKURAN_HALAMAN = 1000;
const MAKS_BARIS = 5000;
const MAKS_RENTANG_HARI = 366;

const LABEL_NILAI: Record<string, string> = {
  sangat_puas: "Sangat puas",
  puas: "Puas",
  cukup: "Cukup",
  kurang_puas: "Kurang puas",
};
const URUTAN_NILAI = ["sangat_puas", "puas", "cukup", "kurang_puas"];
const WARNA_NILAI: Record<string, string> = {
  sangat_puas: "bg-teal-500/15 text-teal-700",
  puas: "bg-teal-500/10 text-teal-700",
  cukup: "bg-ink/5 text-ink/60",
  kurang_puas: "bg-clay-600/10 text-clay-700",
};

type BarisSurvei = {
  id: string;
  nama_pasien: string | null;
  no_rm: string | null;
  nilai: string;
  saran: string | null;
  dibuat_pada: string;
  klaster: { nama: string } | { nama: string }[] | null;
};

function namaKlasterDari(k: BarisSurvei["klaster"]): string {
  const baris = Array.isArray(k) ? k[0] : k;
  return baris?.nama ?? "Tidak disebutkan";
}

export default async function LaporanKepuasan({
  searchParams,
}: {
  searchParams: { dari?: string; sampai?: string };
}) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  if (!PERAN_LAPORAN.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin dan kepala puskesmas.
      </div>
    );
  }

  // ---- periode ----
  const hariIni = hariIniWib();
  let dari = tanggalValid(searchParams.dari) ? searchParams.dari : geserHari(hariIni, -29);
  let sampai = tanggalValid(searchParams.sampai) ? searchParams.sampai : hariIni;
  if (dari > sampai) [dari, sampai] = [sampai, dari];
  let catatanRentang: string | null = null;
  if (selisihHari(dari, sampai) > MAKS_RENTANG_HARI) {
    dari = geserHari(sampai, -MAKS_RENTANG_HARI);
    catatanRentang = `Rentang dibatasi maksimal ${MAKS_RENTANG_HARI} hari, jadi dimulai dari ${tanggalPanjang(dari)}.`;
  }

  const supabase = createClient();

  const semua: BarisSurvei[] = [];
  let galat: string | null = null;
  let terpotong = false;
  for (let mulai = 0; mulai < MAKS_BARIS; mulai += UKURAN_HALAMAN) {
    const { data, error } = await supabase
      .from("survei_kepuasan")
      .select("id, nama_pasien, no_rm, nilai, saran, dibuat_pada, klaster:klaster_id (nama)")
      .gte("dibuat_pada", awalHariWib(dari))
      .lte("dibuat_pada", akhirHariWib(sampai))
      .order("dibuat_pada", { ascending: false })
      .range(mulai, mulai + UKURAN_HALAMAN - 1);
    if (error) {
      galat = error.message;
      break;
    }
    semua.push(...(data as unknown as BarisSurvei[]));
    if (data.length < UKURAN_HALAMAN) break;
    if (mulai + UKURAN_HALAMAN >= MAKS_BARIS) {
      terpotong = true;
      break;
    }
  }

  // ---- ringkasan ----
  const jumlahPerNilai: Record<string, number> = { sangat_puas: 0, puas: 0, cukup: 0, kurang_puas: 0 };
  for (const s of semua) jumlahPerNilai[s.nilai] = (jumlahPerNilai[s.nilai] ?? 0) + 1;
  const total = semua.length;
  const puasAtauLebih = jumlahPerNilai.sangat_puas + jumlahPerNilai.puas;
  const persenPuas = total > 0 ? Math.round((puasAtauLebih / total) * 100) : null;
  const daftarSaran = semua.filter((s) => s.saran && s.saran.trim().length > 0);

  const bulanIniMulai = `${hariIni.slice(0, 8)}01`;
  const pintasan = [
    { label: "7 hari terakhir", dari: geserHari(hariIni, -6), sampai: hariIni },
    { label: "30 hari terakhir", dari: geserHari(hariIni, -29), sampai: hariIni },
    { label: "Bulan ini", dari: bulanIniMulai, sampai: hariIni },
  ];

  const periodeTeks = dari === sampai ? tanggalPanjang(dari) : `${tanggalPanjang(dari)} s.d. ${tanggalPanjang(sampai)}`;

  return (
    <div className="space-y-6">
      <div className="hidden text-center print:block">
        <p className="text-base font-bold">UPTD PUSKESMAS BEKAWAN</p>
        <p className="text-sm">Laporan Kepuasan Pasien</p>
        <p className="text-sm">Periode {periodeTeks}</p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Laporan Kepuasan Pasien</h1>
          <p className="mt-1.5 text-sm text-ink/60">
            Rekap hasil survei kepuasan yang diisi pasien lewat halaman{" "}
            <span className="font-mono text-xs">/survei</span>.
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
              max={hariIni}
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
              max={hariIni}
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
              href={`/dashboard/laporan/kepuasan?dari=${p.dari}&sampai=${p.sampai}`}
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
          Gagal mengambil data survei: {galat}
        </p>
      )}
      {terpotong && (
        <p className="text-xs text-ink/50">
          Data melebihi {MAKS_BARIS} respons, laporan ini hanya mencakup {MAKS_BARIS} respons terbaru. Persempit
          rentang tanggal untuk hasil yang lengkap.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-card border border-sand-100 bg-white p-4">
          <p className="text-xs font-medium text-ink/50">Total Respons</p>
          <p className="mt-1 text-xl font-extrabold text-ink">{total}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-4">
          <p className="text-xs font-medium text-ink/50">Puas / Sangat Puas</p>
          <p className="mt-1 text-xl font-extrabold text-teal-700">{persenPuas === null ? "—" : `${persenPuas}%`}</p>
        </div>
        {URUTAN_NILAI.map((n) => (
          <div key={n} className="rounded-card border border-sand-100 bg-white p-4">
            <p className="text-xs font-medium text-ink/50">{LABEL_NILAI[n]}</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{jumlahPerNilai[n] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">
          Saran & Masukan ({daftarSaran.length})
        </p>
        <div className="max-h-[480px] divide-y divide-sand-100/70 overflow-y-auto">
          {daftarSaran.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink/45">Belum ada saran pada periode ini.</p>
          ) : (
            daftarSaran.map((s) => (
              <div key={s.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${WARNA_NILAI[s.nilai] ?? ""}`}>
                      {LABEL_NILAI[s.nilai] ?? s.nilai}
                    </span>
                    <span className="text-xs text-ink/50">{namaKlasterDari(s.klaster)}</span>
                  </div>
                  <span className="text-xs text-ink/40">{waktuWib(s.dibuat_pada)}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-sm text-ink">{s.saran}</p>
                {(s.nama_pasien || s.no_rm) && (
                  <p className="mt-1 text-xs text-ink/45">
                    {[s.nama_pasien, s.no_rm && `RM ${s.no_rm}`].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
