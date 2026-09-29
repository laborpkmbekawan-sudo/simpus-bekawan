import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import CariObat from "./cari-obat";

const LABEL_JENIS: Record<string, string> = { masuk: "Masuk", keluar: "Keluar", penyesuaian: "Penyesuaian" };

export default async function HalamanKartuStok({ searchParams }: { searchParams: { obat_id?: string } }) {
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
  const { data: daftarObat } = await supabase.from("obat").select("id, nama_obat").order("nama_obat");

  let obatDipilih: { id: string; nama_obat: string; satuan: string; stok_saat_ini: number } | null = null;
  let mutasi: { id: string; jenis: string; jumlah: number; keterangan: string | null; dibuat_pada: string; pegawai: { nama_lengkap: string } | null }[] = [];

  if (searchParams.obat_id) {
    const [{ data: o }, { data: m }] = await Promise.all([
      supabase.from("obat").select("id, nama_obat, satuan, stok_saat_ini").eq("id", searchParams.obat_id).single(),
      supabase
        .from("mutasi_stok_obat")
        .select("id, jenis, jumlah, keterangan, dibuat_pada, pegawai:dibuat_oleh (nama_lengkap)")
        .eq("obat_id", searchParams.obat_id)
        .order("dibuat_pada", { ascending: true }),
    ]);
    obatDipilih = o;
    mutasi = (m ?? []) as unknown as typeof mutasi;
  }

  // Itung saldo berjalan dari histori mutasi (urut lama -> baru), biar tiap
  // baris nunjukin sisa stok abis transaksi itu -- ini Kartu Stok Digital.
  let saldo = 0;
  const barisDenganSaldo = mutasi.map((m) => {
    if (m.jenis === "keluar") saldo -= Number(m.jumlah);
    else saldo += Number(m.jumlah);
    return { ...m, saldo };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Kartu Stok Digital</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Riwayat keluar-masuk stok per obat, diambil dari log penerimaan &amp; penyerahan resep.
        </p>
      </div>

      <CariObat daftarObat={daftarObat ?? []} />

      {!obatDipilih && (
        <div className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/45">
          Cari dan pilih obat dulu buat lihat kartu stoknya.
        </div>
      )}

      {obatDipilih && (
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-100 px-5 py-4">
            <p className="text-lg font-bold text-ink">{obatDipilih.nama_obat}</p>
            <p className="text-sm text-ink/60">
              Stok sekarang: <span className="font-bold text-ink">{obatDipilih.stok_saat_ini}</span> {obatDipilih.satuan}
            </p>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">Tanggal</th>
                <th className="px-5 py-3 font-medium">Jenis</th>
                <th className="px-5 py-3 font-medium">Keterangan</th>
                <th className="px-5 py-3 font-medium">Petugas</th>
                <th className="px-5 py-3 text-right font-medium">Jumlah</th>
                <th className="px-5 py-3 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {barisDenganSaldo.map((m) => (
                <tr key={m.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-5 py-3 text-ink/70">
                    {new Date(m.dibuat_pada).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        m.jenis === "keluar"
                          ? "rounded-sm bg-clay-600/10 px-2 py-0.5 text-xs font-medium text-clay-700"
                          : "rounded-sm bg-teal-700/10 px-2 py-0.5 text-xs font-medium text-teal-700"
                      }
                    >
                      {LABEL_JENIS[m.jenis] ?? m.jenis}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink/70">{m.keterangan ?? "—"}</td>
                  <td className="px-5 py-3 text-ink/60">{m.pegawai?.nama_lengkap ?? "—"}</td>
                  <td className="px-5 py-3 text-right font-medium text-ink">
                    {m.jenis === "keluar" ? "-" : "+"}
                    {m.jumlah}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-ink">{m.saldo}</td>
                </tr>
              ))}
              {barisDenganSaldo.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-sm text-ink/45">
                    Belum ada mutasi buat obat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
