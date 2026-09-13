import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FilterTanggal from "./filter-tanggal";
import TabelKunjunganHarian from "./tabel-kunjungan-harian";

export default async function HalamanKunjunganHariIni({
  searchParams,
}: {
  searchParams: { tanggal?: string };
}) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  const supabase = createClient();
  const tanggal = searchParams.tanggal || new Date().toISOString().slice(0, 10);
  const bolehLihatSemua = pemanggil.peran === "admin" || pemanggil.peran === "loket_rm_kasir";

  const [{ data: kunjunganMentah }, { data: aksesSaya }] = await Promise.all([
    supabase
      .from("kunjungan")
      .select(
        "id, nomor_antrian, jenis_kunjungan, status, klaster_tujuan_id, pasien:pasien_id (id, no_rm, nama_lengkap), klaster:klaster_tujuan_id (nama, kode_antrian)"
      )
      .eq("tanggal", tanggal)
      .order("nomor_antrian", { ascending: true }),
    bolehLihatSemua
      ? Promise.resolve({ data: [] as { klaster_id: string }[] })
      : supabase.from("akses_klaster").select("klaster_id").eq("pegawai_id", pemanggil.id),
  ]);

  const klasterBolehDilihat = new Set((aksesSaya ?? []).map((a) => a.klaster_id));

  const daftar = (kunjunganMentah ?? [])
    .filter((k) => bolehLihatSemua || klasterBolehDilihat.has(k.klaster_tujuan_id))
    .map((k) => {
      const pasien = k.pasien as unknown as { id: string; no_rm: string; nama_lengkap: string } | null;
      const klaster = k.klaster as unknown as { nama: string; kode_antrian: string | null } | null;
      return {
        kunjunganId: k.id,
        pasienId: pasien?.id ?? "",
        noRm: pasien?.no_rm ?? "—",
        namaPasien: pasien?.nama_lengkap ?? "—",
        nomorTampil: klaster?.kode_antrian
          ? `${klaster.kode_antrian}-${String(k.nomor_antrian).padStart(2, "0")}`
          : String(k.nomor_antrian),
        namaKlaster: klaster?.nama ?? "—",
        jenisKunjungan: k.jenis_kunjungan,
        status: k.status,
      };
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Kunjungan Hari Ini</h1>
          <p className="mt-1.5 text-sm text-ink/60">
            Lihat semua kunjungan lintas klaster, dan siapa yang sudah/belum dilayani.
          </p>
        </div>
        <FilterTanggal tanggal={tanggal} />
      </div>

      <TabelKunjunganHarian daftar={daftar} />
    </div>
  );
}
