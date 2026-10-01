import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import {
  PERAN_LAB,
  STATUS_LOT,
  WARNA_STATUS_KADALUARSA,
  WARNA_STATUS_LOT,
  kadaluarsaEfektif,
  statusKadaluarsa,
} from "@/lib/lab";
import { hariIniWib, tanggalPanjang } from "@/lib/format";
import FormTambahLot, { type OpsiBhpLot } from "./form-tambah-lot";
import AksiLot from "./aksi-lot";

type Lot = {
  id: string;
  bhp_id: string;
  no_lot: string;
  tanggal_kadaluarsa: string;
  tanggal_terima: string;
  jumlah_diterima: number | null;
  stabilitas_hari: number | null;
  status: string;
  tanggal_dibuka: string | null;
  catatan: string | null;
  dicatat_oleh_nama: string | null;
  bhp: { nama_bhp: string; satuan: string; stok_saat_ini: number } | null;
};

function fmt(n: number) {
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

export default async function HalamanReagenLab() {
  const pemanggil = await getPegawaiSaya();
  const boleh = pemanggil && [...PERAN_LAB, "kapus"].includes(pemanggil.peran);
  if (!pemanggil || !boleh) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus Laboratorium, admin, dan Kepala Puskesmas.
      </div>
    );
  }
  const kelola = PERAN_LAB.includes(pemanggil.peran);
  if (kelola) {
    const kodeAkses = await getKodeAksesSaya(pemanggil.id, pemanggil.peran);
    if (!punyaAkses(kodeAkses, "lintas_lab")) {
      return (
        <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
          Akunmu belum dikasih akses ke Laboratorium. Minta admin nambahin akses klaster &quot;Lintas Klaster - Lab&quot; di
          halaman Data Pegawai.
        </div>
      );
    }
  }

  const hariIni = hariIniWib();
  const supabase = createClient();
  const [{ data: lotMentah, error }, { data: bhpMentah }] = await Promise.all([
    supabase
      .from("lab_reagen_lot")
      .select(
        "id, bhp_id, no_lot, tanggal_kadaluarsa, tanggal_terima, jumlah_diterima, stabilitas_hari, status, tanggal_dibuka, catatan, dicatat_oleh_nama, bhp:bhp_id (nama_bhp, satuan, stok_saat_ini)",
      )
      .order("tanggal_kadaluarsa", { ascending: true })
      .range(0, 1999),
    supabase.from("bhp").select("id, nama_bhp, satuan").eq("aktif", true).order("nama_bhp"),
  ]);

  if (error) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Gagal memuat lot reagen: {error.message}
        {error.message.includes("lab_reagen_lot") && " — jalankan migrasi_tahap_48.sql di Supabase dulu."}
      </div>
    );
  }

  const semua = (lotMentah ?? []) as unknown as Lot[];
  const opsiBhp: OpsiBhpLot[] = ((bhpMentah ?? []) as { id: string; nama_bhp: string; satuan: string }[]).map((b) => ({
    id: b.id,
    label: `${b.nama_bhp} (${b.satuan})`,
  }));

  const diolah = semua.map((l) => {
    const ef = kadaluarsaEfektif(l);
    return { l, ef, st: statusKadaluarsa(ef.tanggal, hariIni) };
  });
  const berjalan = diolah.filter((d) => d.l.status === "tersimpan" || d.l.status === "dipakai");
  const riwayat = diolah.filter((d) => d.l.status === "habis" || d.l.status === "dibuang");
  berjalan.sort((a, b) => a.ef.tanggal.localeCompare(b.ef.tanggal));

  // FEFO: kalau satu reagen punya lebih dari satu lot berjalan yang belum
  // kadaluarsa, lot dengan kadaluarsa paling awal dipakai duluan.
  const lotBerjalanPerBhp = new Map<string, typeof berjalan>();
  for (const d of berjalan) {
    if (d.st.status === "kadaluarsa") continue;
    const arr = lotBerjalanPerBhp.get(d.l.bhp_id) ?? [];
    arr.push(d);
    lotBerjalanPerBhp.set(d.l.bhp_id, arr);
  }
  const duluan = new Set<string>();
  for (const arr of Array.from(lotBerjalanPerBhp.values())) {
    if (arr.length > 1) duluan.add(arr[0].l.id);
  }

  const kadaluarsa = berjalan.filter((d) => d.st.status === "kadaluarsa").length;
  const segera = berjalan.filter((d) => d.st.status === "segera").length;
  const dipakai = berjalan.filter((d) => d.l.status === "dipakai").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Lot Reagen &amp; Kadaluarsa</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Catat lot reagen yang diterima beserta kadaluarsanya. Lot yang sudah dibuka ikut dihitung masa stabilitasnya
          (kalau diisi). Lot kadaluarsa jangan dipakai, tandai dibuang. Lot dengan kadaluarsa paling awal dipakai duluan.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Lot berjalan</p>
          <p className="mt-1 text-3xl font-extrabold text-ink">{berjalan.length}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Sedang dipakai</p>
          <p className="mt-1 text-3xl font-extrabold text-teal-700">{dipakai}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Segera kadaluarsa (≤ 30 hari)</p>
          <p className={`mt-1 text-3xl font-extrabold ${segera > 0 ? "text-clay-700" : "text-ink"}`}>{segera}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Sudah kadaluarsa</p>
          <p className={`mt-1 text-3xl font-extrabold ${kadaluarsa > 0 ? "text-red-600" : "text-ink"}`}>{kadaluarsa}</p>
        </div>
      </div>

      {kelola && <FormTambahLot daftarBhp={opsiBhp} hariIni={hariIni} />}

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">Lot berjalan ({berjalan.length})</h2>
        {berjalan.map(({ l, ef, st }) => (
          <div key={l.id} className={`space-y-3 rounded-card border bg-white p-5 ${st.status === "kadaluarsa" ? "border-red-500/40" : "border-sand-100"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-extrabold text-ink">
                  {l.bhp?.nama_bhp ?? "Reagen"} <span className="text-sm font-medium text-ink/40">Lot {l.no_lot}</span>
                </p>
                <p className="text-xs text-ink/55">
                  Diterima {tanggalPanjang(l.tanggal_terima)}
                  {l.jumlah_diterima != null ? ` · ${fmt(Number(l.jumlah_diterima))} ${l.bhp?.satuan ?? ""}` : ""}
                  {l.tanggal_dibuka ? ` · Dibuka ${tanggalPanjang(l.tanggal_dibuka)}` : ""}
                </p>
                <p className="text-xs text-ink/45">
                  Kadaluarsa kemasan {tanggalPanjang(l.tanggal_kadaluarsa)}
                  {l.stabilitas_hari ? ` · Stabil ${l.stabilitas_hari} hari setelah dibuka` : ""}
                </p>
                {l.catatan && <p className="mt-1 text-xs text-ink/55">{l.catatan}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {duluan.has(l.id) && <span className="rounded-sm bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white">Pakai duluan</span>}
                <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${WARNA_STATUS_LOT[l.status]}`}>{STATUS_LOT[l.status]}</span>
                <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${WARNA_STATUS_KADALUARSA[st.status]}`}>
                  {st.status === "kadaluarsa"
                    ? `Kadaluarsa ${Math.abs(st.sisaHari)} hari lalu`
                    : st.sisaHari === 0
                      ? "Kadaluarsa hari ini"
                      : `${st.sisaHari} hari lagi`}
                  {ef.olehStabilitas ? " (stabilitas)" : ""}
                </span>
              </div>
            </div>
            {st.status === "kadaluarsa" && (
              <p className="rounded-sm bg-red-600/10 px-3 py-2 text-xs font-semibold text-red-700">
                Lot ini sudah lewat batas pakai. Jangan dipakai untuk pasien, tandai dibuang.
              </p>
            )}
            {kelola && <AksiLot id={l.id} status={l.status} />}
          </div>
        ))}
        {berjalan.length === 0 && (
          <div className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/45">Belum ada lot berjalan.</div>
        )}
      </section>

      {riwayat.length > 0 && (
        <details className="rounded-card border border-sand-100 bg-white p-5">
          <summary className="cursor-pointer text-sm font-bold text-teal-700">Riwayat lot habis / dibuang ({riwayat.length})</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                  <th className="py-2 pr-4 font-medium">Reagen</th>
                  <th className="py-2 pr-4 font-medium">Lot</th>
                  <th className="py-2 pr-4 font-medium">Kadaluarsa</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.slice(0, 50).map(({ l }) => (
                  <tr key={l.id} className="border-b border-sand-100/70 last:border-0">
                    <td className="py-2 pr-4 text-ink">{l.bhp?.nama_bhp ?? "—"}</td>
                    <td className="py-2 pr-4 text-ink/70">{l.no_lot}</td>
                    <td className="whitespace-nowrap py-2 pr-4 text-ink/70">{tanggalPanjang(l.tanggal_kadaluarsa)}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${WARNA_STATUS_LOT[l.status]}`}>{STATUS_LOT[l.status]}</span>
                    </td>
                    <td className="py-2 text-xs text-ink/55">{l.catatan ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
