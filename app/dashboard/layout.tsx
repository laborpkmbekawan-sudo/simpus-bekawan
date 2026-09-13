import Link from "next/link";
import { redirect } from "next/navigation";
import { getPegawaiSaya } from "@/lib/supabase/server";
import TombolKeluar from "./tombol-keluar";

const LABEL_PERAN: Record<string, string> = {
  admin: "Admin",
  kapus: "Kepala Puskesmas",
  bendahara_bok: "Bendahara BOK",
  manajemen: "Manajemen",
  dokter: "Dokter",
  dokter_gigi: "Dokter Gigi",
  perawat: "Perawat",
  bidan: "Bidan",
  farmasi: "Farmasi",
  laboratorium: "Laboratorium",
  tenaga_gizi: "Tenaga Gizi",
  kesling: "Kesehatan Lingkungan",
  promkes: "Promosi Kesehatan",
  loket_rm_kasir: "Loket / RM / Kasir",
};

export default async function LayoutDashboard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pegawai = await getPegawaiSaya();

  // Login berhasil di Supabase Auth tapi baris pegawai belum dibuat admin.
  if (!pegawai) {
    redirect("/login?alasan=perlu-login");
  }

  const menu = [
    { href: "/dashboard", label: "Beranda" },
    { href: "/dashboard/pasien", label: "Daftar Pasien" },
    { href: "/dashboard/kunjungan-hari-ini", label: "Kunjungan Hari Ini" },
    { href: "/dashboard/antrian", label: "Antrian" },
    { href: "/dashboard/rekam-medis", label: "Rekam Medis" },
    { href: "/dashboard/pegawai", label: "Data Pegawai", peranBoleh: ["admin", "kapus"] },
  ];

  return (
    <div className="grid min-h-screen grid-cols-[260px_1fr] bg-sand-50">
      <aside
        className="sticky top-0 flex h-screen flex-col justify-between overflow-y-auto px-4 py-6 text-white"
        style={{ background: "linear-gradient(180deg, #0D2942 0%, #123D5B 55%, #0F766E 100%)" }}
      >
        <div>
          <div className="border-b border-white/15 px-3 pb-5">
            <div className="text-lg font-bold text-white">SIMPUS Bekawan</div>
            <div className="mt-1 text-xs leading-relaxed text-white/60">
              UPTD Puskesmas Bekawan
              <br />
              Akun Petugas
            </div>
          </div>
          <nav className="mt-4 space-y-1">
            {menu
              .filter((item) => !item.peranBoleh || item.peranBoleh.includes(pegawai.peran))
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-xl border-l-[3px] border-transparent px-3.5 py-3 text-sm font-medium
                             text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
          </nav>
        </div>

        <div className="border-t border-white/15 px-3 pt-4">
          <p className="text-sm font-medium text-white">{pegawai.nama_lengkap}</p>
          <p className="text-xs text-white/55">{LABEL_PERAN[pegawai.peran] ?? pegawai.peran}</p>
          <div className="mt-3">
            <TombolKeluar />
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-10 py-10">{children}</main>
    </div>
  );
}
