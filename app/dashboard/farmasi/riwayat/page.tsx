import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import CariPasien from "./cari-pasien";

const LABEL_STATUS: Record<string, string> = {
  menunggu: "Menunggu",
  diracik: "Diracik",
  selesai: "Selesai diserahkan",
  dibatalkan: "Dibatalkan",
};

function aturanPakai(it: { frekuensi_per_hari: number | null; waktu_pemberian: string | null; durasi_hari: number | null }) {
  const bagian = [
    it.frekuensi_per_hari ? `${it.frekuensi_per_hari}x sehari` : null,
    it.waktu_pemberian,
    it.durasi_hari ? `selama ${it.durasi_hari} hari` : null,
  ].filter(Boolean);
  return bagian.join(", ") || "—";
}

export default async function HalamanRiwayatObat({ searchParams }: { searchParams: { pasien_id?: string } }) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !["admin", "farmasi"].includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus farmasi/admin.
      </div>
    );
  }
  const kodeAkses = await getKodeAksesSaya(pemanggil.id, pemanggil.peran);
  if (!punyaAkses(kodeAkses, "lintas_farmasi")) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Akunmu belum dikasih akses ke Farmasi. Minta admin nambahin akses klaster
        &quot;Lintas Klaster - Farmasi&quot; di halaman Data Pegawai.
      </div>
    );
  }

  const supabase = createClient();
  const { data: semuaPasien } = await supabase.from("pasien").select("id, no_rm, nama_lengkap").order("nama_lengkap");

  let pasien: { nama_lengkap: string; no_rm: string } | null = null;
  let riwayat: {
    id: string;
    status: string;
    dibuat_pada: string;
    diserahkan_pada: string | null;
    kunjungan: { tanggal: string } | null;
    items: {
      id: string;
      dosis: string | null;
      frekuensi_per_hari: number | null;
      waktu_pemberian: string | null;
      durasi_hari: number | null;
      jumlah: number;
      dibatalkan: boolean;
      obat: { nama_obat: string; satuan: string } | null;
    }[];
  }[] = [];

  if (searchParams.pasien_id) {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("pasien").select("nama_lengkap, no_rm").eq("id", searchParams.pasien_id).single(),
      supabase
        .from("resep_obat")
        .select(
          `id, status, dibuat_pada, diserahkan_pada,
           kunjungan:kunjungan_id!inner (tanggal, pasien_id),
           items:resep_obat_item (id, dosis, frekuensi_per_hari, waktu_pemberian, durasi_hari, jumlah, dibatalkan,
             obat:obat_id (nama_obat, satuan))`
        )
        .eq("kunjungan.pasien_id", searchParams.pasien_id)
        .order("dibuat_pada", { ascending: false }),
    ]);
    pasien = p;
    riwayat = (r ?? []) as unknown as typeof riwayat;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Riwayat Obat Pasien</h1>
        <p className="mt-1.5 text-sm text-ink/60">Semua resep pasien lintas kunjungan, buat cek riwayat pengobatan.</p>
      </div>

      <CariPasien semuaPasien={semuaPasien ?? []} />

      {!pasien && (
        <div className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/45">
          Cari dan pilih pasien dulu buat lihat riwayat obatnya.
        </div>
      )}

      {pasien && (
        <div className="space-y-3">
          <p className="text-sm text-ink/60">
            {pasien.nama_lengkap} · No. RM {pasien.no_rm} · {riwayat.length} resep
          </p>
          {riwayat.map((r) => (
            <div key={r.id} className="rounded-card border border-sand-100 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink">
                  Kunjungan {r.kunjungan?.tanggal ? new Date(r.kunjungan.tanggal).toLocaleDateString("id-ID", { dateStyle: "long" }) : "—"}
                </p>
                <span className="rounded-sm bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink/60">
                  {LABEL_STATUS[r.status] ?? r.status}
                </span>
              </div>
              <table className="mt-3 w-full text-left text-sm">
                <tbody>
                  {r.items
                    .filter((it) => !it.dibatalkan)
                    .map((it) => (
                      <tr key={it.id} className="border-b border-sand-100/70 last:border-0">
                        <td className="py-2 pr-4 text-ink">{it.obat?.nama_obat ?? "—"}</td>
                        <td className="py-2 pr-4 text-ink/60">{it.dosis ?? "—"}</td>
                        <td className="py-2 pr-4 text-ink/60">{aturanPakai(it)}</td>
                        <td className="py-2 text-right font-medium text-ink">
                          {it.jumlah} {it.obat?.satuan}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
          {riwayat.length === 0 && (
            <div className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/45">
              Belum ada resep buat pasien ini.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
