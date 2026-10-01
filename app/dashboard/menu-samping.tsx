"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useNotifikasiRujukan } from "./notifikasi-rujukan";
import { useNotifikasiLab } from "./notifikasi-lab";

// kodeAksesButuh: kode klaster (tabel `klaster`, mis. "lintas_pendaftaran")
// yang jadi syarat -- ini PATOKAN UTAMA. Kalau pegawai gak punya akses ke
// kode itu (dicek lewat tabel akses_klaster), menu gak muncul, titik --
// gak peduli peran-nya apa. peranBoleh cuma filter tambahan/pelengkap.
type Item = {
  href: string;
  label: string;
  peranBoleh?: string[];
  kodeAksesButuh?: string;
  lencanaRujukan?: boolean;
  // Lencana notifikasi Lab: "masuk" = permintaan menunggu (petugas Lab),
  // "hasil" = hasil selesai belum dibuka (peminta).
  lencanaLab?: "masuk" | "hasil";
};
type Grup = {
  label: string;
  href?: string;
  peranBoleh?: string[];
  kodeAksesButuh?: string;
  anak?: Item[];
};

// Peran yang menangani alur pasien langsung (pendaftaran, antrian, rujukan,
// rekam medis). Peran non-klinis (manajemen/klaster 1, bendahara BOK,
// kesling, promkes) gak perlu menu ini di sidebar.
const PERAN_LAYANAN_PASIEN = [
  "admin",
  "kapus",
  "loket_rm_kasir",
  "dokter",
  "dokter_gigi",
  "perawat",
  "bidan",
  "farmasi",
  "laboratorium",
  "tenaga_gizi",
];

// Menu bertingkat: grup dengan `anak` jadi dropdown, grup dengan `href`
// langsung jadi link tunggal.
const MENU: Grup[] = [
  { label: "Beranda", href: "/dashboard" },
  {
    label: "Pendaftaran Pasien",
    peranBoleh: PERAN_LAYANAN_PASIEN,
    kodeAksesButuh: "lintas_pendaftaran",
    anak: [
      { href: "/dashboard/pasien", label: "Daftar Pasien" },
      { href: "/dashboard/kunjungan-hari-ini", label: "Kunjungan Hari Ini" },
    ],
  },
  {
    label: "Pelayanan & Rujukan",
    peranBoleh: PERAN_LAYANAN_PASIEN,
    anak: [
      { href: "/dashboard/antrian", label: "Antrian" },
      { href: "/dashboard/rujukan", label: "Rujukan", lencanaRujukan: true },
    ],
  },
  { label: "Rekam Medis", href: "/dashboard/rekam-medis", peranBoleh: PERAN_LAYANAN_PASIEN },
  {
    label: "Laboratorium",
    peranBoleh: ["admin", "kapus", "laboratorium", "dokter", "dokter_gigi", "perawat", "bidan"],
    anak: [
      {
        href: "/dashboard/lab",
        label: "Antrean Permintaan",
        peranBoleh: ["admin", "laboratorium"],
        kodeAksesButuh: "lintas_lab",
        lencanaLab: "masuk",
      },
      { href: "/dashboard/lab/hasil", label: "Hasil Laboratorium", lencanaLab: "hasil" },
      { href: "/dashboard/lab/riwayat", label: "Riwayat & Tren Pasien" },
      { href: "/dashboard/lab/rujukan", label: "Rujukan Lab Keluar", peranBoleh: ["admin", "kapus", "laboratorium"] },
      { href: "/dashboard/lab/qc", label: "Kontrol Mutu (QC)", peranBoleh: ["admin", "kapus", "laboratorium"] },
      { href: "/dashboard/lab/alat", label: "Alat & Kalibrasi", peranBoleh: ["admin", "kapus", "laboratorium"] },
      { href: "/dashboard/lab/reagen", label: "Lot Reagen & Kadaluarsa", peranBoleh: ["admin", "kapus", "laboratorium"] },
      { href: "/dashboard/lab/katalog", label: "Katalog Pemeriksaan" },
      {
        href: "/dashboard/lab/laporan",
        label: "Register & Laporan Lab",
        peranBoleh: ["admin", "kapus", "laboratorium"],
      },
    ],
  },
  {
    label: "Klaster 2 (Ibu, Anak & Remaja)",
    // Grup dibuka utk bendahara_bok juga (cuma butuh anak Laporan-nya),
    // makanya tiap anak non-laporan dikunci ulang ke peran klinis asli.
    peranBoleh: ["admin", "kapus", "bendahara_bok", "perawat", "bidan"],
    anak: [
      {
        href: "/dashboard/klaster2",
        label: "Dashboard",
        peranBoleh: ["admin", "kapus", "perawat", "bidan"],
        kodeAksesButuh: "klaster_2",
      },
      {
        href: "/dashboard/klaster2/kohort",
        label: "Kohort & Register",
        peranBoleh: ["admin", "kapus", "perawat", "bidan"],
        kodeAksesButuh: "klaster_2",
      },
      {
        href: "/dashboard/laporan/klaster2",
        label: "Laporan KIA & Anak",
        peranBoleh: ["admin", "kapus", "bendahara_bok", "perawat", "bidan"],
      },
    ],
  },
  {
    label: "Klaster 3 (Usia Produktif & Lansia)",
    // Sama seperti Klaster 2: grup dibuka utk bendahara_bok, anak non-laporan
    // dikunci lagi ke peran klinis asli.
    peranBoleh: ["admin", "kapus", "bendahara_bok", "perawat", "bidan", "tenaga_gizi"],
    anak: [
      {
        href: "/dashboard/klaster3",
        label: "Dashboard",
        peranBoleh: ["admin", "kapus", "perawat", "bidan", "tenaga_gizi"],
        kodeAksesButuh: "klaster_3",
      },
      {
        href: "/dashboard/klaster3/dewasa",
        label: "Pelayanan Usia Dewasa",
        peranBoleh: ["admin", "kapus", "perawat", "bidan", "tenaga_gizi"],
        kodeAksesButuh: "klaster_3",
      },
      {
        href: "/dashboard/klaster3/lansia",
        label: "Pelayanan Lansia",
        peranBoleh: ["admin", "kapus", "perawat", "bidan", "tenaga_gizi"],
        kodeAksesButuh: "klaster_3",
      },
      {
        href: "/dashboard/klaster3/posbindu",
        label: "Posbindu PTM & Prolanis",
        peranBoleh: ["admin", "kapus", "perawat", "bidan", "tenaga_gizi"],
        kodeAksesButuh: "klaster_3",
      },
      {
        href: "/dashboard/klaster3/jadwal",
        label: "Jadwal Posbindu & Lansia",
        peranBoleh: ["admin", "kapus", "perawat", "bidan", "tenaga_gizi"],
        kodeAksesButuh: "klaster_3",
      },
      {
        href: "/dashboard/klaster3/kohort",
        label: "Kohort & Register Prolanis",
        peranBoleh: ["admin", "kapus", "perawat", "bidan", "tenaga_gizi"],
        kodeAksesButuh: "klaster_3",
      },
      {
        href: "/dashboard/laporan/klaster3",
        label: "Laporan Klaster 3",
        peranBoleh: ["admin", "kapus", "bendahara_bok", "perawat", "bidan", "tenaga_gizi"],
      },
    ],
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
  {
    label: "Farmasi",
    peranBoleh: ["admin", "farmasi"],
    kodeAksesButuh: "lintas_farmasi",
    anak: [
      { href: "/dashboard/farmasi/resep", label: "Verifikasi & Penyerahan Resep" },
      { href: "/dashboard/farmasi/resep/entri", label: "Entri Resep Manual" },
      { href: "/dashboard/farmasi/riwayat", label: "Riwayat Obat Pasien" },
      { href: "/dashboard/farmasi/obat", label: "Master Data Obat & Penerimaan" },
      { href: "/dashboard/farmasi/stok-opname", label: "Stok Opname" },
      { href: "/dashboard/farmasi/kartu-stok", label: "Kartu Stok Digital" },
      { href: "/dashboard/farmasi/lplpo", label: "LPLPO" },
      { href: "/dashboard/farmasi/laporan", label: "Laporan" },
      { href: "/dashboard/farmasi/bhp", label: "Bahan Habis Pakai (BHP)" },
    ],
  },
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
      { href: "/dashboard/manajemen/perencanaan", label: "Perencanaan" },
      { href: "/dashboard/manajemen/ilp", label: "Manajemen ILP" },
      { href: "/dashboard/manajemen/ukm", label: "Manajemen UKM" },
      { href: "/dashboard/manajemen/ukp", label: "Manajemen UKP" },
      { href: "/dashboard/manajemen/sdm", label: "Manajemen SDM" },
      { href: "/dashboard/manajemen/keuangan", label: "Keuangan Internal" },
      { href: "/dashboard/manajemen/pengaduan-kepuasan", label: "Pengaduan & Kepuasan" },
      { href: "/dashboard/manajemen/pelayanan", label: "Manajemen Pelayanan" },
      { href: "/dashboard/manajemen/risiko", label: "Manajemen Risiko" },
      { href: "/dashboard/manajemen/rapat", label: "Rapat & Tindak Lanjut" },
      { href: "/dashboard/manajemen/dokumen", label: "Dokumen & Akreditasi" },
      { href: "/dashboard/manajemen/audit", label: "Audit & Pengendalian" },
      { href: "/dashboard/manajemen/pustu", label: "Pustu & Jejaring" },
      { href: "/dashboard/manajemen/sarana", label: "Sarana & Prasarana" },
      { href: "/dashboard/manajemen/program-prioritas", label: "Program Prioritas" },
      { href: "/dashboard/manajemen/logistik", label: "Manajemen Logistik" },
      { href: "/dashboard/manajemen/laporan", label: "Laporan Internal" },
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

function Lencana({ jumlah, label = "notifikasi rujukan" }: { jumlah: number; label?: string }) {
  return (
    <span
      className="ml-2 min-w-[20px] rounded-full bg-clay-600 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white"
      aria-label={`${jumlah} ${label}`}
    >
      {jumlah > 99 ? "99+" : jumlah}
    </span>
  );
}

export default function MenuSamping({
  peran,
  kodeAkses,
}: {
  peran: string;
  // "semua" buat admin (bebas semua). Selain itu: daftar kode klaster (tabel
  // `klaster`) yang pegawai ini beneran punya baris akses_klaster-nya --
  // INI PATOKAN UTAMA nampil/nutup menu, bukan cuma peran.
  kodeAkses: string[] | "semua";
}) {
  const pathname = usePathname();
  const { jumlah: jumlahMasuk, jumlahPembaruan } = useNotifikasiRujukan();
  // Rujukan masuk yang belum diterima + pembaruan rujukan keluar yang belum dilihat.
  const jumlahRujukan = jumlahMasuk + jumlahPembaruan;
  const { mode: modeLab, jumlah: jumlahLab } = useNotifikasiLab();
  // Jumlah lencana Lab untuk satu item menu (0 = tidak tampil).
  const lencanaLabItem = (a: Item) =>
    (a.lencanaLab === "masuk" && modeLab === "lab") || (a.lencanaLab === "hasil" && modeLab === "klinis") ? jumlahLab : 0;

  const boleh = (p?: string[]) => !p || p.includes(peran);
  const adaAkses = (kode?: string) => !kode || kodeAkses === "semua" || kodeAkses.includes(kode);
  const lolos = (x: { peranBoleh?: string[]; kodeAksesButuh?: string }) =>
    boleh(x.peranBoleh) && adaAkses(x.kodeAksesButuh);

  const grupTampil = MENU.filter((g) => lolos(g))
    .map((g) => ({ ...g, anak: g.anak?.filter((a) => lolos(a)) }))
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
                {!terbuka && anak.some((a) => lencanaLabItem(a) > 0) && (
                  <Lencana jumlah={Math.max(...anak.map(lencanaLabItem))} label="notifikasi laboratorium" />
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
                      {lencanaLabItem(a) > 0 && <Lencana jumlah={lencanaLabItem(a)} label="notifikasi laboratorium" />}
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
