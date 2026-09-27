import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormMutasiObat from "./form-mutasi-obat";

const PERAN_FARMASI = ["admin", "farmasi"];

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HalamanMutasiObat() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_FARMASI.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus farmasi/admin.
      </div>
    );
  }

  const supabase = createClient();

  const [{ data: daftarObat }, { data: riwayatMentah }] = await Promise.all([
    supabase.from("obat").select("id, nama_obat, satuan").eq("aktif", true).order("nama_obat"),
    supabase
      .from("mutasi_stok_obat")
      .select("id, jenis, jumlah, sumber, no_batch, tanggal_kadaluwarsa, keterangan, dibuat_pada, obat:obat_id (nama_obat, satuan)")
      .order("dibuat_pada", { ascending: false })
      .limit(50),
  ]);

  const riwayat = (
    (riwayatMentah ?? []) as unknown as {
      id: string;
      jenis: string;
      jumlah: number;
      sumber: string | null;
      no_batch: string | null;
      tanggal_kadaluwarsa: string | null;
      keterangan: string | null;
      dibuat_pada: string;
      obat: { nama_obat: string; satuan: string } | null;
    }[]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Mutasi & Penerimaan Obat</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Catat penerimaan stok resmi dari gudang farmasi/dinkes, lengkap dengan sumber, no. batch, dan tanggal
          kadaluwarsa. Stok obat kebentuk otomatis.
        </p>
      </div>

      <FormMutasiObat daftarObat={daftarObat ?? []} />

      <div>
        <h2 className="mb-3 text-lg font-extrabold text-ink">Riwayat Mutasi (50 Terakhir)</h2>
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">Tanggal</th>
                <th className="px-5 py-3 font-medium">Obat</th>
                <th className="px-5 py-3 font-medium">Jenis</th>
                <th className="px-5 py-3 font-medium">Jumlah</th>
                <th className="px-5 py-3 font-medium">Sumber</th>
                <th className="px-5 py-3 font-medium">No. Batch</th>
                <th className="px-5 py-3 font-medium">Kadaluwarsa</th>
              </tr>
            </thead>
            <tbody>
              {riwayat.map((m) => (
                <tr key={m.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-5 py-3.5 text-ink/60">{formatTanggal(m.dibuat_pada)}</td>
                  <td className="px-5 py-3.5 text-ink">{m.obat?.nama_obat ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${
                        m.jenis === "masuk"
                          ? "bg-teal-500/10 text-teal-700"
                          : m.jenis === "keluar"
                            ? "bg-clay-600/10 text-clay-700"
                            : "bg-ink/10 text-ink/60"
                      }`}
                    >
                      {m.jenis}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-ink">
                    {m.jumlah} {m.obat?.satuan ?? ""}
                  </td>
                  <td className="px-5 py-3.5 text-ink/60">{m.sumber ?? "—"}</td>
                  <td className="px-5 py-3.5 text-ink/60">{m.no_batch ?? "—"}</td>
                  <td className="px-5 py-3.5 text-ink/60">{m.tanggal_kadaluwarsa ?? "—"}</td>
                </tr>
              ))}
              {riwayat.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-sm text-ink/45">
                    Belum ada riwayat mutasi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
