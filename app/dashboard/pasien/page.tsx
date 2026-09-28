import { createClient } from "@/lib/supabase/server";
import TabelDaftarPasien from "./tabel-daftar-pasien";
import Link from "next/link";

export default async function HalamanPasien({
  searchParams,
}: {
  searchParams: { tanggal?: string; baru?: string };
}) {
  const supabase = createClient();
  const tanggal = searchParams.tanggal || new Date().toISOString().slice(0, 10);

  const [{ data: kunjunganMentah }, { data: semuaPasien }, pasienBaruQuery] = await Promise.all([
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
    // Diambil kalau baru aja selesai simpan pasien baru (lihat redirect di
    // actions.ts), buat nampilin ajakan lanjut daftar kunjungan -- biar
    // petugas gak perlu cari manual lagi pasien yang baru aja dia input.
    searchParams.baru
      ? supabase
          .from("pasien")
          .select("id, no_rm, nama_lengkap")
          .eq("id", searchParams.baru)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const pasienBaru = pasienBaruQuery?.data ?? null;

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

      {pasienBaru && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-teal-700/20 bg-teal-500/10 p-4">
          <p className="text-sm text-ink">
            Pasien baru <span className="font-bold">{pasienBaru.nama_lengkap}</span> (No. RM{" "}
            {pasienBaru.no_rm}) berhasil disimpan.
          </p>
          <Link
            href={`/dashboard/pasien/${pasienBaru.id}/kunjungan`}
            className="whitespace-nowrap rounded-sm bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white
                       hover:bg-teal-900"
          >
            Daftarkan Kunjungan →
          </Link>
        </div>
      )}

      <TabelDaftarPasien
        tanggal={tanggal}
        kunjunganHariIni={kunjunganHariIni}
        semuaPasien={semuaPasien ?? []}
      />
    </div>
  );
}
