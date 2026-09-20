import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TabsRekamMedis from "./tabs-rekam-medis";

// Halaman BACA SAJA. Input catatan klinis + tindakan ada di
// /dashboard/pelayanan/[kunjunganId], dibuka dari kartu antrian.
export default async function HalamanRekamMedis({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: pasien }, { data: kunjunganMentah }] = await Promise.all([
    supabase
      .from("pasien")
      .select("id, no_rm, nama_lengkap, tanggal_lahir, jenis_kelamin, alergi, family_folder")
      .eq("id", params.id)
      .single(),
    supabase
      .from("kunjungan")
      .select(
        "id, tanggal, status, jenis_penjamin, klaster:klaster_tujuan_id (nama), catatan_klinis (subjektif, objektif, diagnosis, tindakan, catatan_klinis), kunjungan_tindakan (dibatalkan, tarif:tarif_layanan_id (nama_layanan))"
      )
      .eq("pasien_id", params.id)
      .order("tanggal", { ascending: false })
      .order("dibuat_pada", { ascending: false }),
  ]);

  if (!pasien) notFound();

  const riwayat = (kunjunganMentah ?? []).map((k) => {
    type CatatanKlinis = {
      subjektif: string | null;
      objektif: string | null;
      diagnosis: string | null;
      tindakan: string | null;
      catatan_klinis: string | null; // kolom lama sebelum SOAP
    };
    const c = k.catatan_klinis as unknown as CatatanKlinis | CatatanKlinis[] | null;
    const catatan = Array.isArray(c) ? c[0] ?? null : c;
    const daftarTindakan = (
      (k.kunjungan_tindakan as unknown as
        | { dibatalkan: boolean; tarif: { nama_layanan: string } | null }[]
        | null) ?? []
    )
      .filter((t) => !t.dibatalkan)
      .map((t) => t.tarif?.nama_layanan ?? "—");

    return {
      id: k.id,
      tanggal: k.tanggal,
      status: k.status,
      penjamin: k.jenis_penjamin,
      namaKlaster: (k.klaster as unknown as { nama: string } | null)?.nama ?? "—",
      diagnosis: catatan?.diagnosis ?? null,
      subjektif: catatan?.subjektif ?? null,
      // Catatan lama (sebelum SOAP) tetap terbaca lewat kolom lama kalau O belum terisi.
      objektif: catatan?.objektif ?? catatan?.catatan_klinis ?? null,
      plan: catatan?.tindakan ?? null,
      daftarTindakan,
    };
  });

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

      <TabsRekamMedis pasien={pasien} riwayat={riwayat} />
    </div>
  );
}
