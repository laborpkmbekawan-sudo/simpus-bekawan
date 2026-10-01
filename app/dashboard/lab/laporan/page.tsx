import Link from "next/link";
import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import { PERAN_LAB, STATUS_LAB, WARNA_STATUS_LAB } from "@/lib/lab";
import { akhirHariWib, awalHariWib, hariIniWib, tanggalPanjang, tanggalValid, waktuWib } from "@/lib/format";
import FilterPeriode from "../../farmasi/filter-periode";
import TombolCetak from "../[id]/cetak/tombol-cetak";

const BATAS_BARIS = 2000;

type Baris = {
  id: string;
  no_lab: string;
  status: string;
  prioritas: string;
  diminta_oleh_nama: string | null;
  diminta_pada: string;
  divalidasi_pada: string | null;
  kritis_dilaporkan_pada: string | null;
  kunjungan: {
    pasien: { nama_lengkap: string; no_rm: string } | null;
    klaster: { nama: string } | null;
  } | null;
  items: {
    id: string;
    dibatalkan: boolean;
    pemeriksaan: { nama: string; kategori: string } | null;
    hasil: { flag: string | null; kritis: boolean }[];
  }[];
};

function menitAntara(awal: string, akhir: string) {
  return Math.max(0, Math.round((Date.parse(akhir) - Date.parse(awal)) / 60000));
}

function teksDurasi(menit: number | null) {
  if (menit == null) return "—";
  if (menit < 60) return `${menit} mnt`;
  const j = Math.floor(menit / 60);
  const m = menit % 60;
  if (j < 24) return m ? `${j} j ${m} mnt` : `${j} j`;
  const h = Math.floor(j / 24);
  return `${h} h ${j % 24} j`;
}

function median(angka: number[]) {
  if (angka.length === 0) return null;
  const s = [...angka].sort((a, b) => a - b);
  const t = Math.floor(s.length / 2);
  return s.length % 2 ? s[t] : Math.round((s[t - 1] + s[t]) / 2);
}

const ADA_ABNORMAL = ["rendah", "tinggi", "abnormal"];

export default async function HalamanLaporanLab({
  searchParams,
}: {
  searchParams: { dari?: string; sampai?: string };
}) {
  const pemanggil = await getPegawaiSaya();
  const boleh = pemanggil && [...PERAN_LAB, "kapus"].includes(pemanggil.peran);
  if (!pemanggil || !boleh) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus Laboratorium, admin, dan Kepala Puskesmas.
      </div>
    );
  }
  if (PERAN_LAB.includes(pemanggil.peran)) {
    const kodeAkses = await getKodeAksesSaya(pemanggil.id, pemanggil.peran);
    if (!punyaAkses(kodeAkses, "lintas_lab")) {
      return (
        <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
          Akunmu belum dikasih akses ke Laboratorium. Minta admin nambahin akses klaster &quot;Lintas Klaster - Lab&quot; di
          halaman Data Pegawai.
        </div>
      );
    }
  }

  const hariIni = hariIniWib();
  const dari = tanggalValid(searchParams.dari) ? searchParams.dari : `${hariIni.slice(0, 8)}01`;
  const sampai = tanggalValid(searchParams.sampai) ? searchParams.sampai : hariIni;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("lab_permintaan")
    .select(
      `id, no_lab, status, prioritas, diminta_oleh_nama, diminta_pada, divalidasi_pada, kritis_dilaporkan_pada,
       kunjungan:kunjungan_id (
         pasien:pasien_id (nama_lengkap, no_rm),
         klaster:klaster_tujuan_id (nama)
       ),
       items:lab_permintaan_item (
         id, dibatalkan,
         pemeriksaan:pemeriksaan_id (nama, kategori),
         hasil:lab_hasil (flag, kritis)
       )`
    )
    .gte("diminta_pada", awalHariWib(dari))
    .lte("diminta_pada", akhirHariWib(sampai))
    .order("diminta_pada", { ascending: false })
    .range(0, BATAS_BARIS - 1);

  if (error) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Gagal memuat laporan lab: {error.message}
      </div>
    );
  }

  const daftar = (data ?? []) as unknown as Baris[];

  // FITUR 5 -- pemakaian BHP/reagen lab pada periode (dari mutasi stok otomatis).
  const { data: mutasiMentah } = await supabase
    .from("mutasi_stok_bhp")
    .select("jumlah, bhp:bhp_id (nama_bhp, satuan)")
    .eq("jenis", "keluar")
    .ilike("keterangan", "Lab LAB-%")
    .gte("dibuat_pada", awalHariWib(dari))
    .lte("dibuat_pada", akhirHariWib(sampai))
    .range(0, 4999);
  const pakaiBhp = new Map<string, { nama: string; satuan: string; total: number }>();
  for (const m of (mutasiMentah ?? []) as unknown as { jumlah: number; bhp: { nama_bhp: string; satuan: string } | null }[]) {
    const nama = m.bhp?.nama_bhp ?? "—";
    const x = pakaiBhp.get(nama) ?? { nama, satuan: m.bhp?.satuan ?? "", total: 0 };
    x.total += Number(m.jumlah);
    pakaiBhp.set(nama, x);
  }
  const rekapBhp = [...pakaiBhp.values()].sort((a, b) => b.total - a.total);

  // ---- Ringkasan ----
  const perStatus: Record<string, number> = {};
  for (const p of daftar) perStatus[p.status] = (perStatus[p.status] ?? 0) + 1;
  const jumlahCito = daftar.filter((p) => p.prioritas === "cito").length;

  const waktuTunggu = daftar
    .filter((p) => p.status === "selesai" && p.divalidasi_pada)
    .map((p) => menitAntara(p.diminta_pada, p.divalidasi_pada as string));
  const rataTunggu = waktuTunggu.length ? Math.round(waktuTunggu.reduce((a, b) => a + b, 0) / waktuTunggu.length) : null;
  const medianTunggu = median(waktuTunggu);
  const terlama = waktuTunggu.length ? Math.max(...waktuTunggu) : null;

  // ---- Per pemeriksaan (hanya item yang tidak dibatalkan) ----
  type Rekap = { nama: string; kategori: string; total: number; selesai: number; abnormal: number };
  const perPemeriksaan = new Map<string, Rekap>();
  let totalItem = 0;
  for (const p of daftar) {
    if (p.status === "dibatalkan") continue;
    for (const i of p.items) {
      if (i.dibatalkan || !i.pemeriksaan) continue;
      totalItem += 1;
      const r = perPemeriksaan.get(i.pemeriksaan.nama) ?? {
        nama: i.pemeriksaan.nama,
        kategori: i.pemeriksaan.kategori,
        total: 0,
        selesai: 0,
        abnormal: 0,
      };
      r.total += 1;
      if (p.status === "selesai") {
        r.selesai += 1;
        if (i.hasil.some((h) => h.flag && ADA_ABNORMAL.includes(h.flag))) r.abnormal += 1;
      }
      perPemeriksaan.set(i.pemeriksaan.nama, r);
    }
  }
  const rekapPemeriksaan = [...perPemeriksaan.values()].sort((a, b) => b.total - a.total);
  const totalAbnormal = rekapPemeriksaan.reduce((t, r) => t + r.abnormal, 0);
  const totalSelesaiItem = rekapPemeriksaan.reduce((t, r) => t + r.selesai, 0);

  // ---- Per klaster asal ----
  const perKlaster = new Map<string, number>();
  for (const p of daftar) {
    const nama = p.kunjungan?.klaster?.nama ?? "Tanpa klaster";
    perKlaster.set(nama, (perKlaster.get(nama) ?? 0) + 1);
  }
  const rekapKlaster = [...perKlaster.entries()].sort((a, b) => b[1] - a[1]);

  const permintaanKritis = daftar.filter((p) => p.status !== "dibatalkan" && p.items.some((i) => !i.dibatalkan && i.hasil.some((h) => h.kritis)));
  const kritisBelumLapor = permintaanKritis.filter((p) => !p.kritis_dilaporkan_pada).length;

  // FITUR 9 & 10 -- penolakan sampel dan ringkasan QC pada periode. Galat diabaikan
  // (mis. migrasi 47 belum jalan) supaya laporan utama tetap tampil.
  const [{ data: tolakMentah }, { data: qcMentah }] = await Promise.all([
    supabase
      .from("lab_penolakan_sampel")
      .select("alasan")
      .gte("ditolak_pada", awalHariWib(dari))
      .lte("ditolak_pada", akhirHariWib(sampai))
      .range(0, 4999),
    supabase.from("lab_qc_hasil").select("status").gte("tanggal", dari).lte("tanggal", sampai).range(0, 4999),
  ]);
  const perAlasanTolak = new Map<string, number>();
  for (const t of (tolakMentah ?? []) as { alasan: string }[]) {
    perAlasanTolak.set(t.alasan, (perAlasanTolak.get(t.alasan) ?? 0) + 1);
  }
  const rekapTolak = [...perAlasanTolak.entries()].sort((a, b) => b[1] - a[1]);
  const totalTolak = rekapTolak.reduce((t, [, n]) => t + n, 0);
  const qcPeriode = (qcMentah ?? []) as { status: string }[];
  const qcPerStatus = (st: string) => qcPeriode.filter((q) => q.status === st).length;

  const terpotong = daftar.length >= BATAS_BARIS;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/dashboard/lab"
            className="text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2 print:hidden"
          >
            ← Antrean Permintaan
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold text-ink">Register & Laporan Laboratorium</h1>
          <p className="mt-1.5 text-sm text-ink/60">
            Periode {tanggalPanjang(dari)} – {tanggalPanjang(sampai)} (berdasarkan tanggal permintaan).
          </p>
        </div>
        <TombolCetak />
      </div>

      <div className="print:hidden">
        <FilterPeriode dari={dari} sampai={sampai} />
      </div>

      {terpotong && (
        <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-3 text-sm text-clay-700">
          Data dipotong di {BATAS_BARIS.toLocaleString("id-ID")} permintaan terbaru. Persempit periode supaya angka lengkap.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Permintaan</p>
          <p className="mt-1 text-3xl font-extrabold text-ink">{daftar.length}</p>
          <p className="text-xs text-ink/50">{jumlahCito} cito</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Selesai</p>
          <p className="mt-1 text-3xl font-extrabold text-teal-700">{perStatus["selesai"] ?? 0}</p>
          <p className="text-xs text-ink/50">
            {(perStatus["dibatalkan"] ?? 0)} dibatalkan · {daftar.length - (perStatus["selesai"] ?? 0) - (perStatus["dibatalkan"] ?? 0)} belum selesai
          </p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Waktu tunggu rata-rata</p>
          <p className="mt-1 text-3xl font-extrabold text-ink">{teksDurasi(rataTunggu)}</p>
          <p className="text-xs text-ink/50">
            median {teksDurasi(medianTunggu)} · terlama {teksDurasi(terlama)}
          </p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Pemeriksaan abnormal</p>
          <p className="mt-1 text-3xl font-extrabold text-red-600">{totalAbnormal}</p>
          <p className="text-xs text-ink/50">
            dari {totalSelesaiItem} pemeriksaan selesai · total diminta {totalItem}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">Rekap per pemeriksaan</h2>
        <div className="overflow-x-auto rounded-card border border-sand-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-4 py-3 font-medium">Pemeriksaan</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 text-right font-medium">Diminta</th>
                <th className="px-4 py-3 text-right font-medium">Selesai</th>
                <th className="px-4 py-3 text-right font-medium">Abnormal</th>
                <th className="px-4 py-3 text-right font-medium">% abnormal</th>
              </tr>
            </thead>
            <tbody>
              {rekapPemeriksaan.map((r) => (
                <tr key={r.nama} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-ink">{r.nama}</td>
                  <td className="px-4 py-2.5 text-ink/60">{r.kategori}</td>
                  <td className="px-4 py-2.5 text-right text-ink">{r.total}</td>
                  <td className="px-4 py-2.5 text-right text-ink">{r.selesai}</td>
                  <td className="px-4 py-2.5 text-right text-ink">{r.abnormal}</td>
                  <td className="px-4 py-2.5 text-right text-ink/70">
                    {r.selesai ? `${Math.round((r.abnormal / r.selesai) * 100)}%` : "—"}
                  </td>
                </tr>
              ))}
              {rekapPemeriksaan.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink/45">
                    Belum ada pemeriksaan pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">Penolakan sampel ({totalTolak})</h2>
        <div className="flex flex-wrap gap-2">
          {rekapTolak.map(([alasan, n]) => (
            <span key={alasan} className="rounded-sm bg-clay-600/10 px-3 py-1.5 text-xs font-semibold text-clay-700">
              {alasan}: {n}
            </span>
          ))}
          {rekapTolak.length === 0 && <span className="text-sm text-ink/45">Tidak ada sampel ditolak pada periode ini.</span>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">Kontrol mutu (QC) pada periode</h2>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-sm bg-teal-700/10 px-3 py-1.5 text-xs font-semibold text-teal-700">
            Dalam kendali: {qcPerStatus("dalam_kendali")}
          </span>
          <span className="rounded-sm bg-clay-600/10 px-3 py-1.5 text-xs font-semibold text-clay-700">
            Peringatan: {qcPerStatus("peringatan")}
          </span>
          <span
            className={`rounded-sm px-3 py-1.5 text-xs font-semibold ${
              qcPerStatus("ditolak") > 0 ? "bg-red-600 text-white" : "bg-ink/5 text-ink/60"
            }`}
          >
            Ditolak: {qcPerStatus("ditolak")}
          </span>
          <Link
            href="/dashboard/lab/qc"
            className="rounded-sm border border-sand-100 px-3 py-1.5 text-xs font-semibold text-teal-700 print:hidden"
          >
            Buka Kontrol Mutu →
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">Nilai kritis</h2>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-sm bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600">
            Permintaan dengan nilai kritis: {permintaanKritis.length}
          </span>
          <span
            className={`rounded-sm px-3 py-1.5 text-xs font-semibold ${
              kritisBelumLapor > 0 ? "bg-red-600 text-white" : "bg-teal-700/10 text-teal-700"
            }`}
          >
            Belum dicatat dilaporkan: {kritisBelumLapor}
          </span>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">Pemakaian reagen & BHP lab</h2>
        <div className="overflow-x-auto rounded-card border border-sand-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-4 py-3 font-medium">BHP / reagen</th>
                <th className="px-4 py-3 text-right font-medium">Terpakai</th>
              </tr>
            </thead>
            <tbody>
              {rekapBhp.map((r) => (
                <tr key={r.nama} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-ink">{r.nama}</td>
                  <td className="px-4 py-2.5 text-right text-ink">
                    {Math.round(r.total * 100) / 100} {r.satuan}
                  </td>
                </tr>
              ))}
              {rekapBhp.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-ink/45">
                    Belum ada pemakaian BHP lab tercatat pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">Permintaan per klaster asal</h2>
        <div className="flex flex-wrap gap-2">
          {rekapKlaster.map(([nama, jumlah]) => (
            <span key={nama} className="rounded-sm bg-teal-700/10 px-3 py-1.5 text-xs font-semibold text-teal-700">
              {nama}: {jumlah}
            </span>
          ))}
          {rekapKlaster.length === 0 && <span className="text-sm text-ink/45">—</span>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">Buku register ({daftar.length})</h2>
        <div className="overflow-x-auto rounded-card border border-sand-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-4 py-3 font-medium">No. Lab</th>
                <th className="px-4 py-3 font-medium">Waktu minta</th>
                <th className="px-4 py-3 font-medium">Pasien</th>
                <th className="px-4 py-3 font-medium">Pemeriksaan</th>
                <th className="px-4 py-3 font-medium">Peminta / klaster</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Waktu tunggu</th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((p) => {
                const pasien = p.kunjungan?.pasien;
                const nama = p.items.filter((i) => !i.dibatalkan).map((i) => i.pemeriksaan?.nama ?? "—");
                return (
                  <tr key={p.id} className="border-b border-sand-100/70 align-top last:border-0">
                    <td className="px-4 py-2.5 font-semibold text-ink">
                      {p.no_lab}
                      {p.prioritas === "cito" && (
                        <span className="ml-1.5 rounded-sm bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-600">CITO</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-ink/70">{waktuWib(p.diminta_pada)}</td>
                    <td className="px-4 py-2.5 text-ink">
                      {pasien?.nama_lengkap ?? "—"}
                      <span className="block text-xs text-ink/45">RM {pasien?.no_rm ?? "-"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-ink/80">{nama.join(", ") || "—"}</td>
                    <td className="px-4 py-2.5 text-ink/70">
                      {p.diminta_oleh_nama ?? "—"}
                      <span className="block text-xs text-ink/45">{p.kunjungan?.klaster?.nama ?? "—"}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${WARNA_STATUS_LAB[p.status] ?? "bg-ink/5 text-ink/70"}`}>
                        {STATUS_LAB[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-ink/70">
                      {p.status === "selesai" && p.divalidasi_pada
                        ? teksDurasi(menitAntara(p.diminta_pada, p.divalidasi_pada))
                        : "—"}
                    </td>
                  </tr>
                );
              })}
              {daftar.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-ink/45">
                    Belum ada permintaan lab pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
