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

  const [{ data: pasien }, { data: kunjunganMentah }, { data: daftarTarifMentah }, { data: daftarResepMentah }] =
    await Promise.all([
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
      supabase
        .from("tarif_layanan")
        .select("id, nama_layanan, harga, kategori")
        .eq("aktif", true)
        .order("kategori")
        .order("nama_layanan"),
      supabase.from("resep_bhp_tindakan").select("tarif_layanan_id, jumlah_default, bhp:bhp_id (id, nama_bhp, satuan)"),
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

  const resepPerTarif: Record<
    string,
    { bhp_id: string; nama_bhp: string; satuan: string; jumlah_default: number }[]
  > = {};
  for (const r of daftarResepMentah ?? []) {
    const bhp = r.bhp as unknown as { id: string; nama_bhp: string; satuan: string } | null;
    if (!bhp) continue;
    const daftar = resepPerTarif[r.tarif_layanan_id] ?? [];
    daftar.push({ bhp_id: bhp.id, nama_bhp: bhp.nama_bhp, satuan: bhp.satuan, jumlah_default: Number(r.jumlah_default) });
    resepPerTarif[r.tarif_layanan_id] = daftar;
  }

  let tindakanTercatat: {
    id: string;
    namaLayanan: string;
    dicatatPada: string;
    items: { namaBhp: string; jumlah: number; satuan: string }[];
  }[] = [];

  if (kunjunganHariIniMentah) {
    const { data: tindakanMentah } = await supabase
      .from("kunjungan_tindakan")
      .select(
        "id, dicatat_pada, tarif:tarif_layanan_id (nama_layanan), kunjungan_tindakan_bhp (jumlah_terpakai, bhp:bhp_id (nama_bhp, satuan))"
      )
      .eq("kunjungan_id", kunjunganHariIniMentah.id)
      .eq("dibatalkan", false)
      .order("dicatat_pada", { ascending: false });

    tindakanTercatat = (tindakanMentah ?? []).map((t) => ({
      id: t.id,
      namaLayanan: (t.tarif as unknown as { nama_layanan: string } | null)?.nama_layanan ?? "—",
      dicatatPada: t.dicatat_pada,
      items: (
        (t.kunjungan_tindakan_bhp as unknown as
          | { jumlah_terpakai: number; bhp: { nama_bhp: string; satuan: string } | null }[]
          | null) ?? []
      ).map((i) => ({
        namaBhp: i.bhp?.nama_bhp ?? "—",
        jumlah: Number(i.jumlah_terpakai),
        satuan: i.bhp?.satuan ?? "",
      })),
    }));
  }

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
        daftarTarif={daftarTarifMentah ?? []}
        resepPerTarif={resepPerTarif}
        tindakanTercatat={tindakanTercatat}
      />
    </div>
  );
}
