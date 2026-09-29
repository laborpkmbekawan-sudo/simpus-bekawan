import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import FilterPeriode from "../filter-periode";

function awalBulanIni() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function hariIni() {
  return new Date().toISOString().slice(0, 10);
}

export default async function HalamanLaporanApotek({ searchParams }: { searchParams: { dari?: string; sampai?: string } }) {
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

  const dari = searchParams.dari || awalBulanIni();
  const sampai = searchParams.sampai || hariIni();
  const dariAwalHari = `${dari}T00:00:00`;
  const sampaiAkhirHari = `${sampai}T23:59:59`;

  const supabase = createClient();
  const [{ data: resepSelesai }, { data: mutasiKeluar }, { data: semuaObat }] = await Promise.all([
    supabase
      .from("resep_obat")
      .select("id, diserahkan_pada")
      .eq("status", "selesai")
      .gte("diserahkan_pada", dariAwalHari)
      .lte("diserahkan_pada", sampaiAkhirHari),
    supabase
      .from("mutasi_stok_obat")
      .select("jumlah, obat:obat_id (nama_obat, satuan)")
      .eq("jenis", "keluar")
      .gte("dibuat_pada", dariAwalHari)
      .lte("dibuat_pada", sampaiAkhirHari),
    supabase.from("obat").select("id, nama_obat, satuan, stok_saat_ini, stok_minimum").eq("aktif", true).order("nama_obat"),
  ]);

  const daftarMutasiKeluar = (mutasiKeluar ?? []) as unknown as { jumlah: number; obat: { nama_obat: string; satuan: string } | null }[];

  // Gabungin per nama obat buat cari obat terlaris dalam periode ini.
  const pemakaianPerObat = new Map<string, { nama: string; satuan: string; total: number }>();
  for (const m of daftarMutasiKeluar) {
    const nama = m.obat?.nama_obat ?? "—";
    const x = pemakaianPerObat.get(nama) ?? { nama, satuan: m.obat?.satuan ?? "", total: 0 };
    x.total += Number(m.jumlah);
    pemakaianPerObat.set(nama, x);
  }
  const obatTerlaris = [...pemakaianPerObat.values()].sort((a, b) => b.total - a.total).slice(0, 10);

  const totalResepDiserahkan = resepSelesai?.length ?? 0;
  const totalItemKeluar = daftarMutasiKeluar.reduce((t, m) => t + Number(m.jumlah), 0);
  const obatKritis = (semuaObat ?? []).filter((o) => Number(o.stok_saat_ini) <= Number(o.stok_minimum));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Laporan Apotek</h1>
        <p className="mt-1.5 text-sm text-ink/60">Ringkasan aktivitas farmasi untuk periode yang dipilih.</p>
      </div>

      <FilterPeriode dari={dari} sampai={sampai} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Resep diserahkan</p>
          <p className="mt-1 text-3xl font-extrabold text-ink">{totalResepDiserahkan}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Total item obat keluar</p>
          <p className="mt-1 text-3xl font-extrabold text-ink">{totalItemKeluar}</p>
        </div>
        <div className="rounded-card border border-clay-600/20 bg-clay-600/5 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-clay-700">Obat stok kritis sekarang</p>
          <p className="mt-1 text-3xl font-extrabold text-clay-700">{obatKritis.length}</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">10 Obat Terlaris Periode Ini</h2>
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">Nama Obat</th>
                <th className="px-5 py-3 text-right font-medium">Total Keluar</th>
              </tr>
            </thead>
            <tbody>
              {obatTerlaris.map((o) => (
                <tr key={o.nama} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-5 py-2.5 text-ink">{o.nama}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-ink">
                    {o.total} {o.satuan}
                  </td>
                </tr>
              ))}
              {obatTerlaris.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-5 py-6 text-center text-sm text-ink/45">
                    Belum ada obat keluar di periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">Obat Stok Kritis</h2>
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">Nama Obat</th>
                <th className="px-5 py-3 text-right font-medium">Stok Sekarang</th>
                <th className="px-5 py-3 text-right font-medium">Stok Minimum</th>
              </tr>
            </thead>
            <tbody>
              {obatKritis.map((o) => (
                <tr key={o.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-5 py-2.5 text-ink">{o.nama_obat}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-clay-700">
                    {o.stok_saat_ini} {o.satuan}
                  </td>
                  <td className="px-5 py-2.5 text-right text-ink/60">
                    {o.stok_minimum} {o.satuan}
                  </td>
                </tr>
              ))}
              {obatKritis.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-sm text-ink/45">
                    Gak ada obat yang stoknya kritis.
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
