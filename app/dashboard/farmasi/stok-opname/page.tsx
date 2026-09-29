import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import FormStokOpname from "./form-stok-opname";

export default async function HalamanStokOpname() {
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
  const [{ data: daftarObat }, { data: riwayatMentah }] = await Promise.all([
    supabase.from("obat").select("id, nama_obat, satuan, stok_saat_ini").eq("aktif", true).order("nama_obat"),
    supabase
      .from("stok_opname")
      .select("id, catatan, dibuat_pada, pegawai:dibuat_oleh (nama_lengkap), items:stok_opname_item (id, selisih)")
      .order("dibuat_pada", { ascending: false })
      .limit(10),
  ]);

  const riwayat = (riwayatMentah ?? []) as unknown as {
    id: string;
    catatan: string | null;
    dibuat_pada: string;
    pegawai: { nama_lengkap: string } | null;
    items: { id: string; selisih: number }[];
  }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Stok Opname</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Isi hasil hitung fisik. Obat yang selisih otomatis disamain ke sistem dan tercatat di Kartu Stok sebagai
          penyesuaian.
        </p>
      </div>

      <FormStokOpname daftarObat={daftarObat ?? []} />

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">Riwayat sesi opname</h2>
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">Tanggal</th>
                <th className="px-5 py-3 font-medium">Petugas</th>
                <th className="px-5 py-3 font-medium">Catatan</th>
                <th className="px-5 py-3 font-medium">Item dihitung</th>
                <th className="px-5 py-3 font-medium">Item selisih</th>
              </tr>
            </thead>
            <tbody>
              {riwayat.map((r) => {
                const jumlahSelisih = r.items.filter((it) => Number(it.selisih) !== 0).length;
                return (
                  <tr key={r.id} className="border-b border-sand-100/70 last:border-0">
                    <td className="px-5 py-3 text-ink/70">
                      {new Date(r.dibuat_pada).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-5 py-3 text-ink/60">{r.pegawai?.nama_lengkap ?? "—"}</td>
                    <td className="px-5 py-3 text-ink/60">{r.catatan ?? "—"}</td>
                    <td className="px-5 py-3 text-ink">{r.items.length}</td>
                    <td className="px-5 py-3">
                      {jumlahSelisih > 0 ? (
                        <span className="font-medium text-clay-700">{jumlahSelisih} item</span>
                      ) : (
                        <span className="text-ink/40">Cocok semua</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {riwayat.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-sm text-ink/45">
                    Belum ada sesi opname.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
