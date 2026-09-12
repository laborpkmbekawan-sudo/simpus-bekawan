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
    { href: "/dashboard/pegawai", label: "Data Pegawai", peranBoleh: ["admin", "kapus"] },
  ];

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-sand-50">
      <aside className="sticky top-0 flex h-screen flex-col justify-between overflow-y-auto border-r border-teal-900/10 bg-white px-5 py-6">
        <div>
          <div className="px-1.5 text-sm font-semibold text-teal-900">
            SIMPUS Bekawan
          </div>
          <nav className="mt-8 space-y-1">
            {menu
              .filter((item) => !item.peranBoleh || item.peranBoleh.includes(pegawai.peran))
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-sm px-3 py-2 text-sm text-ink/70 transition-colors
                             hover:bg-teal-900/5 hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
          </nav>
        </div>

        <div className="border-t border-teal-900/10 pt-4">
          <p className="px-1.5 text-sm font-medium text-ink">
            {pegawai.nama_lengkap}
          </p>
          <p className="px-1.5 text-xs text-ink/50">
            {LABEL_PERAN[pegawai.peran] ?? pegawai.peran}
          </p>
          <div className="mt-3">
            <TombolKeluar />
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-10 py-10">{children}</main>
    </div>
  );
}
