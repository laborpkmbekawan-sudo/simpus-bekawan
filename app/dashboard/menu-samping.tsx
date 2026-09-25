"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useNotifikasiRujukan } from "./notifikasi-rujukan";

type Item = { href: string; label: string; peranBoleh?: string[]; lencanaRujukan?: boolean };
type Grup = { label: string; href?: string; peranBoleh?: string[]; anak?: Item[] };

// Menu bertingkat: grup dengan `anak` jadi dropdown, grup dengan `href`
// langsung jadi link tunggal.
const MENU: Grup[] = [
  { label: "Beranda", href: "/dashboard" },
  {
    label: "Pendaftaran Pasien",
    anak: [
      { href: "/dashboard/pasien", label: "Daftar Pasien" },
      { href: "/dashboard/kunjungan-hari-ini", label: "Kunjungan Hari Ini" },
    ],
  },
  {
    label: "Pelayanan & Rujukan",
    anak: [
      { href: "/dashboard/antrian", label: "Antrian" },
      { href: "/dashboard/rujukan", label: "Rujukan", lencanaRujukan: true },
    ],
  },
  { label: "Rekam Medis", href: "/dashboard/rekam-medis" },
  {
    label: "Dashboard Klaster 2",
    href: "/dashboard/klaster2",
    peranBoleh: ["admin", "kapus", "perawat", "bidan"],
  },
  {
    label: "Laporan KIA & Anak",
    href: "/dashboard/laporan/klaster2",
    peranBoleh: ["admin", "kapus", "bendahara_bok", "perawat", "bidan"],
  },
  { label: "Mutu & Keselamatan Pasien", href: "/dashboard/mutu" },
  {
    label: "Kasir & Pembayaran",
    peranBoleh: ["admin", "loket_rm_kasir"],
    anak: [
      { href: "/dashboard/kasir", label: "Transaksi Kasir" },
      { href: "/dashboard/kasir/tarif", label: "Tarif & Tindakan", peranBoleh: ["admin"] },
    ],
  },
  { label: "Farmasi (BHP)", href: "/dashboard/farmasi", peranBoleh: ["admin", "farmasi"] },
  {
    label: "Laporan Internal",
    peranBoleh: ["admin", "kapus", "bendahara_bok", "loket_rm_kasir"],
    anak: [
      { href: "/dashboard/laporan/kasir", label: "Laporan Kasir" },
      { href: "/dashboard/laporan/pelayanan", label: "Laporan Pelayanan" },
      { href: "/dashboard/laporan/lb1", label: "Laporan LB1" },
      { href: "/dashboard/laporan/spm", label: "Laporan SPM", peranBoleh: ["admin", "kapus"] },
      { href: "/dashboard/laporan/kepuasan", label: "Laporan Kepuasan", peranBoleh: ["admin", "kapus"] },
      { href: "/dashboard/laporan/aktivitas", label: "Log Aktivitas", peranBoleh: ["admin", "kapus"] },
    ],
  },
  { label: "Data Pegawai", href: "/dashboard/pegawai", peranBoleh: ["admin", "kapus"] },
  {
    label: "Manajemen Puskesmas",
    peranBoleh: ["admin", "kapus", "manajemen"],
    anak: [
      { href: "/dashboard/manajemen", label: "Dashboard Manajemen" },
      { href: "/dashboard/manajemen/sdm", label: "Manajemen SDM" },
      { href: "/dashboard/manajemen/keuangan", label: "Keuangan Internal" },
      { href: "/dashboard/manajemen/pengaduan-kepuasan", label: "Pengaduan & Kepuasan" },
      { href: "/dashboard/manajemen/pelayanan", label: "Manajemen Pelayanan" },
      { href: "/dashboard/manajemen/risiko", label: "Manajemen Risiko" },
      { href: "/dashboard/manajemen/rapat", label: "Rapat & Tindak Lanjut" },
      { href: "/dashboard/manajemen/dokumen", label: "Dokumen & Akreditasi" },
    ],
  },
  { label: "Master Data", href: "/dashboard/master-data", peranBoleh: ["admin"] },
];

function cocok(pathname: string, href: string, semuaHref: string[]) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (!(pathname === href || pathname.startsWith(href + "/"))) return false;
  // Kalau ada href lain yang lebih spesifik dan juga cocok, yang itu menang
  // (mis. /dashboard/kasir/tarif vs /dashboard/kasir).
  return !semuaHref.some((h) => h.length > href.length && (pathname === h || pathname.startsWith(h + "/")));
}

const CLS_ITEM =
  "block rounded-xl border-l-[3px] px-3.5 py-3 text-sm font-medium transition-colors hover:bg-white/10 hover:text-white";

function Lencana({ jumlah }: { jumlah: number }) {
  return (
    <span
      className="ml-2 min-w-[20px] rounded-full bg-clay-600 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white"
      aria-label={`${jumlah} notifikasi rujukan`}
    >
      {jumlah > 99 ? "99+" : jumlah}
    </span>
  );
}

export default function MenuSamping({ peran }: { peran: string }) {
  const pathname = usePathname();
  const { jumlah: jumlahMasuk, jumlahPembaruan } = useNotifikasiRujukan();
  // Rujukan masuk yang belum diterima + pembaruan rujukan keluar yang belum dilihat.
  const jumlahRujukan = jumlahMasuk + jumlahPembaruan;

  const boleh = (p?: string[]) => !p || p.includes(peran);
  const grupTampil = MENU.filter((g) => boleh(g.peranBoleh))
    .map((g) => ({ ...g, anak: g.anak?.filter((a) => boleh(a.peranBoleh)) }))
    .filter((g) => g.href || (g.anak && g.anak.length > 0));

  const semuaHref = grupTampil.flatMap((g) => (g.href ? [g.href] : g.anak!.map((a) => a.href)));

  // Grup yang berisi halaman aktif otomatis terbuka; sisanya bisa dibuka manual.
  const [terbukaManual, setTerbukaManual] = useState<Record<string, boolean>>({});

  return (
    <nav className="mt-4 space-y-1">
      {grupTampil.map((g) => {
        if (g.href) {
          const aktif = cocok(pathname, g.href, semuaHref);
          return (
            <Link
              key={g.label}
              href={g.href}
              className={`${CLS_ITEM} ${
                aktif ? "border-teal-500 bg-white/15 text-white" : "border-transparent text-white/80"
              }`}
            >
              {g.label}
            </Link>
          );
        }

        const anak = g.anak!;
        const adaAktif = anak.some((a) => cocok(pathname, a.href, semuaHref));
        const terbuka = terbukaManual[g.label] ?? adaAktif;

        return (
          <div key={g.label}>
            <button
              type="button"
              onClick={() => setTerbukaManual((s) => ({ ...s, [g.label]: !terbuka }))}
              aria-expanded={terbuka}
              className={`${CLS_ITEM} flex w-full items-center justify-between text-left ${
                adaAktif ? "border-teal-500 text-white" : "border-transparent text-white/80"
              }`}
            >
              <span>{g.label}</span>
              <span className="flex items-center">
                {!terbuka && jumlahRujukan > 0 && anak.some((a) => a.lencanaRujukan) && (
                  <Lencana jumlah={jumlahRujukan} />
                )}
                <span className={`ml-2 text-xs transition-transform ${terbuka ? "rotate-180" : ""}`} aria-hidden>
                  ⌄
                </span>
              </span>
            </button>
            {terbuka && (
              <div className="mb-1 ml-3 mt-1 space-y-0.5 border-l border-white/15 pl-2">
                {anak.map((a) => {
                  const aktif = cocok(pathname, a.href, semuaHref);
                  return (
                    <Link
                      key={a.href}
                      href={a.href}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors hover:bg-white/10 hover:text-white ${
                        aktif ? "bg-white/15 font-semibold text-white" : "text-white/70"
                      }`}
                    >
                      <span>{a.label}</span>
                      {a.lencanaRujukan && jumlahRujukan > 0 && <Lencana jumlah={jumlahRujukan} />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
