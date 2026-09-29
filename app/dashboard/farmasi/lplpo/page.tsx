import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import FilterPeriode from "../filter-periode";

function awalBulanIni() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function hariIni() {
  return new Date().toISOString().slice(0, 10);
}

export default async function HalamanLplpo({ searchParams }: { searchParams: { dari?: string; sampai?: string } }) {
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
  const [{ data: daftarObat }, { data: mutasiSejakAwal }] = await Promise.all([
    supabase.from("obat").select("id, nama_obat, satuan, stok_saat_ini, stok_minimum").eq("aktif", true).order("nama_obat"),
    // Ambil SEMUA mutasi sejak "dari" s/d sekarang -- dipakai buat mundurin
    // stok ke posisi awal periode, walau laporan dibuka belakangan.
    supabase
      .from("mutasi_stok_obat")
      .select("obat_id, jenis, jumlah, dibuat_pada")
      .gte("dibuat_pada", dariAwalHari)
      .order("dibuat_pada", { ascending: true }),
  ]);

  const semuaMutasi = (mutasiSejakAwal ?? []) as { obat_id: string; jenis: string; jumlah: number; dibuat_pada: string }[];

  function delta(jenis: string, jumlah: number) {
    if (jenis === "keluar") return -Number(jumlah);
    return Number(jumlah); // masuk (+), penyesuaian (udah signed dari sononya)
  }

  const baris = (daftarObat ?? []).map((o) => {
    const mutasiObatIni = semuaMutasi.filter((m) => m.obat_id === o.id);
    const netSejakAwalSampaiSekarang = mutasiObatIni.reduce((total, m) => total + delta(m.jenis, m.jumlah), 0);
    const stokAwal = Number(o.stok_saat_ini) - netSejakAwalSampaiSekarang;

    const mutasiDalamPeriode = mutasiObatIni.filter((m) => m.dibuat_pada <= sampaiAkhirHari);
    const penerimaan = mutasiDalamPeriode.filter((m) => m.jenis === "masuk").reduce((t, m) => t + Number(m.jumlah), 0);
    const pemakaian = mutasiDalamPeriode.filter((m) => m.jenis === "keluar").reduce((t, m) => t + Number(m.jumlah), 0);
    const penyesuaian = mutasiDalamPeriode.filter((m) => m.jenis === "penyesuaian").reduce((t, m) => t + Number(m.jumlah), 0);

    const persediaan = stokAwal + penerimaan;
    const stokAkhir = persediaan - pemakaian + penyesuaian;
    // Asumsi stok optimum = 2x stok minimum (buffer sebulan lagi di atas
    // ambang kritis) -- silakan disesuaikan nanti kalau puskesmas punya
    // patokan sendiri per obat.
    const stokOptimum = Number(o.stok_minimum) * 2;
    const permintaan = Math.max(0, stokOptimum - stokAkhir);

    return {
      id: o.id,
      nama_obat: o.nama_obat,
      satuan: o.satuan,
      stokAwal,
      penerimaan,
      persediaan,
      pemakaian,
      penyesuaian,
      stokAkhir,
      stokMinimum: Number(o.stok_minimum),
      stokOptimum,
      permintaan,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">LPLPO</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Laporan Pemakaian dan Lembar Permintaan Obat per periode. Stok optimum diasumsikan 2x stok minimum --
          sesuaikan kalau puskesmas punya patokan sendiri.
        </p>
      </div>

      <FilterPeriode dari={dari} sampai={sampai} />

      <div className="overflow-x-auto rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="whitespace-nowrap px-4 py-3 font-medium">Nama Obat</th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Stok Awal</th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Penerimaan</th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Persediaan</th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Pemakaian</th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Penyesuaian</th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Stok Akhir</th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Stok Optimum</th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Usulan Permintaan</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => {
              const kritis = b.stokAkhir <= b.stokMinimum;
              return (
                <tr key={b.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink">{b.nama_obat}</td>
                  <td className="px-4 py-2.5 text-right text-ink/70">{b.stokAwal}</td>
                  <td className="px-4 py-2.5 text-right text-teal-700">{b.penerimaan > 0 ? `+${b.penerimaan}` : 0}</td>
                  <td className="px-4 py-2.5 text-right text-ink/70">{b.persediaan}</td>
                  <td className="px-4 py-2.5 text-right text-clay-700">{b.pemakaian > 0 ? `-${b.pemakaian}` : 0}</td>
                  <td className="px-4 py-2.5 text-right text-ink/50">
                    {b.penyesuaian === 0 ? "0" : b.penyesuaian > 0 ? `+${b.penyesuaian}` : b.penyesuaian}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-bold ${kritis ? "text-clay-700" : "text-ink"}`}>
                    {b.stokAkhir} {b.satuan}
                  </td>
                  <td className="px-4 py-2.5 text-right text-ink/50">{b.stokOptimum}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-ink">
                    {b.permintaan > 0 ? `${b.permintaan} ${b.satuan}` : "—"}
                  </td>
                </tr>
              );
            })}
            {baris.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-sm text-ink/45">
                  Belum ada data obat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
