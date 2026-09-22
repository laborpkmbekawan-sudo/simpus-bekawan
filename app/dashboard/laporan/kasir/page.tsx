import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import {
  akhirHariWib,
  awalHariWib,
  geserHari,
  hariIniWib,
  rupiah,
  selisihHari,
  tanggalPanjang,
  tanggalValid,
  waktuWib,
} from "@/lib/format";
import TombolCetak from "./tombol-cetak";

const PERAN_LAPORAN = ["admin", "kapus", "bendahara_bok", "loket_rm_kasir"];
const UKURAN_HALAMAN = 1000; // batas baris per permintaan Supabase
const MAKS_BARIS = 5000;
const MAKS_TAMPIL = 500;
const MAKS_RENTANG_HARI = 366;

type BarisTagihan = {
  id: string;
  dibuat_pada: string;
  jenis_penjamin_saat_bayar: string | null;
  total_tagihan: number | string;
  status_pembayaran: "lunas" | "klaim_bpjs";
  kunjungan: unknown;
};

export default async function LaporanKasir({
  searchParams,
}: {
  searchParams: { dari?: string; sampai?: string };
}) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  if (!PERAN_LAPORAN.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kepala puskesmas, bendahara BOK, dan kasir.
      </div>
    );
  }

  // ---- periode ----
  const hariIni = hariIniWib();
  let dari = tanggalValid(searchParams.dari) ? searchParams.dari : hariIni;
  let sampai = tanggalValid(searchParams.sampai) ? searchParams.sampai : dari;
  if (dari > sampai) [dari, sampai] = [sampai, dari];
  let catatanRentang: string | null = null;
  if (selisihHari(dari, sampai) > MAKS_RENTANG_HARI) {
    dari = geserHari(sampai, -MAKS_RENTANG_HARI);
    catatanRentang = `Rentang dibatasi maksimal ${MAKS_RENTANG_HARI} hari, jadi dimulai dari ${tanggalPanjang(dari)}.`;
  }

  const supabase = createClient();

  // ---- transaksi (tagihan) dalam periode, diambil per halaman ----
  const semua: BarisTagihan[] = [];
  let galat: string | null = null;
  let terpotong = false;
  for (let mulai = 0; mulai < MAKS_BARIS; mulai += UKURAN_HALAMAN) {
    const { data, error } = await supabase
      .from("tagihan")
      .select(
        "id, dibuat_pada, jenis_penjamin_saat_bayar, total_tagihan, status_pembayaran, kunjungan:kunjungan_id (pasien:pasien_id (no_rm, nama_lengkap), klaster:klaster_tujuan_id (nama))"
      )
      .gte("dibuat_pada", awalHariWib(dari))
      .lte("dibuat_pada", akhirHariWib(sampai))
      .order("dibuat_pada", { ascending: true })
      .order("id", { ascending: true })
      .range(mulai, mulai + UKURAN_HALAMAN - 1);
    if (error) {
      galat = error.message;
      break;
    }
    semua.push(...(data as unknown as BarisTagihan[]));
    if (data.length < UKURAN_HALAMAN) break;
    if (mulai + UKURAN_HALAMAN >= MAKS_BARIS) terpotong = true;
  }

  // ---- kunjungan dalam periode yang belum punya tagihan ----
  let belumDiproses = 0;
  for (let mulai = 0; mulai < MAKS_BARIS; mulai += UKURAN_HALAMAN) {
    const { data, error } = await supabase
      .from("kunjungan")
      .select("id, tagihan (id)")
      .gte("tanggal", dari)
      .lte("tanggal", sampai)
      .order("id", { ascending: true })
      .range(mulai, mulai + UKURAN_HALAMAN - 1);
    if (error) break;
    for (const k of data) {
      const t = k.tagihan as unknown;
      const ada = Array.isArray(t) ? t.length > 0 : !!t;
      if (!ada) belumDiproses++;
    }
    if (data.length < UKURAN_HALAMAN) break;
  }

  // ---- ringkasan ----
  const lunas = semua.filter((t) => t.status_pembayaran === "lunas");
  const klaim = semua.filter((t) => t.status_pembayaran === "klaim_bpjs");
  const penerimaanTunai = lunas.reduce((jumlah, t) => jumlah + Number(t.total_tagihan), 0);
  const tampil = semua.slice(0, MAKS_TAMPIL);

  const bulanIniMulai = `${hariIni.slice(0, 8)}01`;
  const pintasan = [
    { label: "Hari ini", dari: hariIni, sampai: hariIni },
    { label: "7 hari terakhir", dari: geserHari(hariIni, -6), sampai: hariIni },
    { label: "Bulan ini", dari: bulanIniMulai, sampai: hariIni },
  ];

  const kartu = [
    { label: "Total Transaksi", nilai: String(semua.length) },
    { label: "Penerimaan Tunai", nilai: rupiah(penerimaanTunai) },
    { label: "Lunas (Tunai)", nilai: String(lunas.length), warna: "text-teal-700" },
    { label: "Klaim BPJS", nilai: String(klaim.length) },
    { label: "Belum Diproses", nilai: String(belumDiproses), warna: belumDiproses > 0 ? "text-clay-700" : undefined },
  ];

  const periodeTeks = dari === sampai ? tanggalPanjang(dari) : `${tanggalPanjang(dari)} s.d. ${tanggalPanjang(sampai)}`;

  return (
    <div className="space-y-6">
      <div className="hidden text-center print:block">
        <p className="text-base font-bold">UPTD PUSKESMAS BEKAWAN</p>
        <p className="text-sm">Laporan Kasir</p>
        <p className="text-sm">Periode {periodeTeks}</p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Laporan Kasir</h1>
          <p className="mt-1.5 text-sm text-ink/60">Rekap transaksi dan penerimaan pembayaran layanan.</p>
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
              href={`/dashboard/laporan/kasir?dari=${p.dari}&sampai=${p.sampai}`}
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
          Gagal mengambil data transaksi: {galat}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {kartu.map((k) => (
          <div key={k.label} className="rounded-card border border-sand-100 bg-white p-4">
            <p className="text-xs font-medium text-ink/50">{k.label}</p>
            <p className={`mt-1 text-xl font-extrabold ${k.warna ?? "text-ink"}`}>{k.nilai}</p>
          </div>
        ))}
      </div>
      <p className="-mt-3 text-xs text-ink/50 print:hidden">
        Belum Diproses = kunjungan pada periode ini yang belum dibuat tagihannya di kasir. Penerimaan Tunai hanya
        menjumlahkan transaksi berstatus lunas; klaim BPJS tidak dihitung sebagai uang tunai.
      </p>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-4 py-3 font-medium">No</th>
              <th className="px-4 py-3 font-medium">Waktu</th>
              <th className="px-4 py-3 font-medium">Pasien</th>
              <th className="px-4 py-3 font-medium">Klaster</th>
              <th className="px-4 py-3 font-medium">Penjamin</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {tampil.map((t, i) => {
              const kj = t.kunjungan as {
                pasien: { no_rm: string; nama_lengkap: string } | null;
                klaster: { nama: string } | null;
              } | null;
              const bpjs = t.jenis_penjamin_saat_bayar === "bpjs";
              return (
                <tr key={t.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-3 text-ink/50">{i + 1}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink/70">{waktuWib(t.dibuat_pada)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{kj?.pasien?.nama_lengkap ?? "—"}</p>
                    <p className="text-xs text-ink/50">RM {kj?.pasien?.no_rm ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-ink/70">{kj?.klaster?.nama ?? "—"}</td>
                  <td className="px-4 py-3 text-ink/70">{bpjs ? "BPJS" : "Umum"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-ink">
                    {rupiah(Number(t.total_tagihan))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${
                        t.status_pembayaran === "lunas" ? "bg-teal-500/15 text-teal-700" : "bg-ink/5 text-ink/60"
                      }`}
                    >
                      {t.status_pembayaran === "lunas" ? "Lunas" : "Klaim BPJS"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {tampil.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink/45">
                  Belum ada transaksi pada periode ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(semua.length > MAKS_TAMPIL || terpotong) && (
        <p className="text-xs text-ink/50">
          {terpotong
            ? `Data melebihi ${MAKS_BARIS} transaksi, ringkasan di atas hanya mencakup ${MAKS_BARIS} transaksi pertama. Persempit rentang tanggal.`
            : `Tabel menampilkan ${MAKS_TAMPIL} dari ${semua.length} transaksi. Ringkasan di atas mencakup semuanya. Persempit rentang tanggal untuk melihat sisanya.`}
        </p>
      )}
    </div>
  );
}
