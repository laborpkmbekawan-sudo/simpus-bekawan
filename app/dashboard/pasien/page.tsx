import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TabelPasien from "./tabel-pasien";

export default async function HalamanPasien({
  searchParams,
}: {
  searchParams: { baru?: string };
}) {
  const supabase = createClient();
  const { data: daftarPasien } = await supabase
    .from("pasien")
    .select("id, no_rm, nik, nama_lengkap, tanggal_lahir, jenis_kelamin, alamat")
    .order("dibuat_pada", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Data Pasien</h1>
          <p className="mt-1.5 text-sm text-ink/60">
            Cari pasien lama atau daftarkan pasien baru.
          </p>
        </div>
        <Link
          href="/dashboard/pasien/baru"
          className="whitespace-nowrap rounded-sm bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white
                     hover:bg-teal-900"
        >
          + Pasien Baru
        </Link>
      </div>

      <TabelPasien daftarPasien={daftarPasien ?? []} idBaruDisorot={searchParams.baru} />
    </div>
  );
}
