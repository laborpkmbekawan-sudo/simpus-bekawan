import { createClient } from "@/lib/supabase/server";
import TabelDaftarPasien from "./tabel-daftar-pasien";
import Link from "next/link";

export default async function HalamanPasien({
  searchParams,
}: {
  searchParams: { tanggal?: string };
}) {
  const supabase = createClient();
  const tanggal = searchParams.tanggal || new Date().toISOString().slice(0, 10);

  const [{ data: kunjunganMentah }, { data: semuaPasien }] = await Promise.all([
    supabase
      .from("kunjungan")
      .select(
        "id, nomor_antrian, jenis_kunjungan, status, pasien:pasien_id (id, no_rm, nik, nama_lengkap, jenis_penjamin, no_bpjs), klaster:klaster_tujuan_id (nama, kode_antrian)"
      )
      .eq("tanggal", tanggal)
      .order("nomor_antrian", { ascending: true }),
    supabase
      .from("pasien")
      .select("id, no_rm, nik, nama_lengkap, jenis_penjamin, no_bpjs"),
  ]);

  const kunjunganHariIni = (kunjunganMentah ?? []).map((k) => {
    const pasien = k.pasien as unknown as {
      id: string;
      no_rm: string;
      nik: string | null;
      nama_lengkap: string;
      jenis_penjamin: string | null;
      no_bpjs: string | null;
    } | null;
    const klaster = k.klaster as unknown as { nama: string; kode_antrian: string | null } | null;
    return {
      kunjunganId: k.id,
      pasienId: pasien?.id ?? "",
      noRm: pasien?.no_rm ?? "—",
      nik: pasien?.nik ?? null,
      namaPasien: pasien?.nama_lengkap ?? "—",
      jenisPenjamin: pasien?.jenis_penjamin ?? null,
      noBpjs: pasien?.no_bpjs ?? null,
      nomorTampil: klaster?.kode_antrian
        ? `${klaster.kode_antrian}-${String(k.nomor_antrian).padStart(2, "0")}`
        : String(k.nomor_antrian),
      namaKlaster: klaster?.nama ?? "—",
      status: k.status,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Daftar Pasien</h1>
          <p className="mt-1.5 text-sm text-ink/60">
            Menampilkan pasien yang berkunjung di tanggal ini. Ketik di kolom cari buat temukan pasien lain.
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

      <TabelDaftarPasien
        tanggal={tanggal}
        kunjunganHariIni={kunjunganHariIni}
        semuaPasien={semuaPasien ?? []}
      />
    </div>
  );
}
