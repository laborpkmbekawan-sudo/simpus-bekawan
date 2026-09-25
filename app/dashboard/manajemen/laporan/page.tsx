import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { hariIniWib } from "@/lib/format";

const PERAN_LIHAT = ["admin", "kapus", "manajemen"];

export default async function HalamanLaporanInternal() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LIHAT.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau manajemen.
      </div>
    );
  }

  const supabase = createClient();
  const hariIni = hariIniWib();
  const bulanIni = Number(hariIni.slice(5, 7));
  const tahunIni = Number(hariIni.slice(0, 4));

  const { data: spmBulanIni } = await supabase
    .from("spm_capaian")
    .select("jumlah_target")
    .eq("bulan", bulanIni)
    .eq("tahun", tahunIni);
  const indikatorTerisi = (spmBulanIni ?? []).filter((i) => i.jumlah_target !== null).length;

  const kelompokLaporan = [
    {
      judul: "Laporan Periodik Pelayanan",
      item: [
        { label: "Laporan Kunjungan Harian/Bulanan (per Unit)", href: "/dashboard/laporan/pelayanan" },
        { label: "LB1 (Data Kesakitan)", href: "/dashboard/laporan/lb1" },
        { label: "SPM Puskesmas", href: "/dashboard/laporan/spm" },
        { label: "Laporan KIA & Anak (Klaster 2)", href: "/dashboard/laporan/klaster2" },
      ],
    },
    {
      judul: "Laporan Keuangan & BOK",
      item: [
        { label: "Rekap Transaksi Kasir", href: "/dashboard/laporan/kasir" },
        { label: "Keuangan Internal (Pendapatan & Pengeluaran)", href: "/dashboard/manajemen/keuangan" },
      ],
    },
    {
      judul: "Laporan Mutu, SDM & Manajemen",
      item: [
        { label: "Kepuasan Pasien", href: "/dashboard/laporan/kepuasan" },
        { label: "Pengaduan & Kepuasan (Gabungan)", href: "/dashboard/manajemen/pengaduan-kepuasan" },
        { label: "Mutu & Keselamatan Pasien", href: "/dashboard/mutu" },
        { label: "Manajemen Risiko", href: "/dashboard/manajemen/risiko" },
        { label: "Audit & Pengendalian", href: "/dashboard/manajemen/audit" },
        { label: "Manajemen SDM", href: "/dashboard/manajemen/sdm" },
        { label: "Aktivitas Sistem (Log)", href: "/dashboard/laporan/aktivitas" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Laporan Internal</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Pusat akses ke semua laporan operasional & manajerial yang sudah berjalan di sistem ini.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-sand-100 bg-white p-4">
          <p className="text-xs font-medium text-ink/50">Indikator SPM Terisi Bulan Ini</p>
          <p className="mt-1 text-xl font-extrabold text-ink">{indikatorTerisi}/12</p>
        </div>
      </div>

      {kelompokLaporan.map((kelompok) => (
        <div key={kelompok.judul} className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">{kelompok.judul}</p>
          <div className="divide-y divide-sand-100/70">
            {kelompok.item.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className="flex items-center justify-between px-4 py-3 text-sm text-ink/80 hover:bg-sand-50"
              >
                <span>{it.label}</span>
                <span className="text-teal-700">Buka →</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
