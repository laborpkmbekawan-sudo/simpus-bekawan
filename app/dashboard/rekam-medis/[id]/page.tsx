import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import TabsRekamMedis from "./tabs-rekam-medis";

const PERAN_KLINIS = ["admin", "dokter", "dokter_gigi", "perawat", "bidan"];

export default async function HalamanRekamMedis({
  params,
}: {
  params: { id: string };
}) {
  const pemanggil = await getPegawaiSaya();
  const supabase = createClient();
  const hariIni = new Date().toISOString().slice(0, 10);

  const [{ data: pasien }, { data: kunjunganMentah }] = await Promise.all([
    supabase
      .from("pasien")
      .select("id, no_rm, nama_lengkap, tanggal_lahir, jenis_kelamin, alergi, family_folder")
      .eq("id", params.id)
      .single(),
    supabase
      .from("kunjungan")
      .select(
        "id, tanggal, klaster:klaster_tujuan_id (nama), catatan_klinis (diagnosis, catatan_klinis, tindakan)"
      )
      .eq("pasien_id", params.id)
      .order("tanggal", { ascending: false })
      .order("dibuat_pada", { ascending: false }),
  ]);

  if (!pasien) {
    notFound();
  }

  const kunjunganHariIniMentah = (kunjunganMentah ?? []).find((k) => k.tanggal === hariIni);
  const catatanHariIni = kunjunganHariIniMentah
    ? (kunjunganHariIniMentah.catatan_klinis as unknown as
        | { diagnosis: string | null; catatan_klinis: string | null; tindakan: string | null }
        | null)
    : null;

  const kunjunganHariIni = kunjunganHariIniMentah
    ? {
        id: kunjunganHariIniMentah.id,
        namaKlaster: (kunjunganHariIniMentah.klaster as unknown as { nama: string } | null)?.nama ?? "—",
        diagnosis: catatanHariIni?.diagnosis ?? "",
        catatanKlinis: catatanHariIni?.catatan_klinis ?? "",
        tindakan: catatanHariIni?.tindakan ?? "",
      }
    : null;

  const riwayat = (kunjunganMentah ?? []).map((k) => ({
    id: k.id,
    tanggal: k.tanggal,
    namaKlaster: (k.klaster as unknown as { nama: string } | null)?.nama ?? "—",
    diagnosis:
      (k.catatan_klinis as unknown as { diagnosis: string | null } | null)?.diagnosis ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/pasien"
          className="text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
        >
          ← Kembali ke Data Pasien
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">Rekam Medis Pasien</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-card border border-sand-100 bg-white p-5 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/40">Nama pasien</p>
          <p className="text-lg font-bold text-ink">{pasien.nama_lengkap}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/40">No. RM</p>
          <p className="text-lg font-bold text-ink">{pasien.no_rm}</p>
        </div>
      </div>

      <TabsRekamMedis
        pasien={pasien}
        kunjunganHariIni={kunjunganHariIni}
        riwayat={riwayat}
        bolehTulis={!!pemanggil && PERAN_KLINIS.includes(pemanggil.peran)}
      />
    </div>
  );
}
