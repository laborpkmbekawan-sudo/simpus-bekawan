import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { awalHariWib, akhirHariWib, hariIniWib, rupiah } from "@/lib/format";
import FormAjukanPengeluaran from "./form-ajukan";
import BarisPengeluaran, { type PengeluaranBaris } from "./baris-pengeluaran";

const PERAN_LIHAT = ["admin", "kapus", "bendahara_bok", "manajemen"];
const PERAN_SETUJUI = ["admin", "kapus", "bendahara_bok"];

export default async function HalamanKeuanganInternal() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LIHAT.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, bendahara BOK, atau manajemen.
      </div>
    );
  }

  const supabase = createClient();
  const hariIni = hariIniWib();
  const bulanIniMulai = `${hariIni.slice(0, 8)}01`;

  const [{ data: tagihanBulanIni }, { data: pengeluaranMentah }] = await Promise.all([
    supabase
      .from("tagihan")
      .select("total_tagihan, status_pembayaran")
      .gte("dibuat_pada", awalHariWib(bulanIniMulai))
      .lte("dibuat_pada", akhirHariWib(hariIni)),
    supabase
      .from("pengeluaran_internal")
      .select(
        "id, tanggal, kategori, jumlah, keterangan, status, diajukan_oleh_pegawai:diajukan_oleh (nama_lengkap)"
      )
      .gte("tanggal", bulanIniMulai)
      .lte("tanggal", hariIni)
      .order("tanggal", { ascending: false }),
  ]);

  const pendapatanTunai = (tagihanBulanIni ?? [])
    .filter((t) => t.status_pembayaran === "lunas")
    .reduce((jumlah, t) => jumlah + Number(t.total_tagihan), 0);

  const daftarPengeluaran = (pengeluaranMentah ?? []) as unknown as PengeluaranBaris[];
  const pengeluaranDisetujui = daftarPengeluaran
    .filter((p) => p.status === "disetujui")
    .reduce((jumlah, p) => jumlah + Number(p.jumlah), 0);
  const pengeluaranMenunggu = daftarPengeluaran.filter((p) => p.status === "diajukan").length;
  const kasBersih = pendapatanTunai - pengeluaranDisetujui;

  const kartu = [
    { label: "Pendapatan Tunai Bulan Ini", nilai: rupiah(pendapatanTunai) },
    { label: "Pengeluaran Disetujui Bulan Ini", nilai: rupiah(pengeluaranDisetujui) },
    { label: "Kas Bersih Bulan Ini", nilai: rupiah(kasBersih), warna: kasBersih < 0 ? "text-clay-700" : "text-teal-700" },
    { label: "Pengeluaran Menunggu Persetujuan", nilai: String(pengeluaranMenunggu) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Keuangan Internal</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Pendapatan diambil otomatis dari transaksi kasir (Lunas/tunai). Pengeluaran diajukan &amp; disetujui di sini.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kartu.map((k) => (
          <div key={k.label} className="rounded-card border border-sand-100 bg-white p-4">
            <p className="text-xs font-medium text-ink/50">{k.label}</p>
            <p className={`mt-1 text-xl font-extrabold ${k.warna ?? "text-ink"}`}>{k.nilai}</p>
          </div>
        ))}
      </div>

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-4 text-base font-bold text-ink">Ajukan Pengeluaran</h2>
        <FormAjukanPengeluaran />
      </section>

      <div className="space-y-3">
        <p className="text-sm font-bold text-ink">Pengeluaran Bulan Ini</p>
        {daftarPengeluaran.map((p) => (
          <BarisPengeluaran key={p.id} pengeluaran={p} bisaSetujui={PERAN_SETUJUI.includes(pemanggil.peran)} />
        ))}
        {daftarPengeluaran.length === 0 && (
          <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">
            Belum ada pengajuan pengeluaran bulan ini.
          </p>
        )}
      </div>
    </div>
  );
}
