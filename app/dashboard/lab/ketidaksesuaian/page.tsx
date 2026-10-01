import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import { DAMPAK_KS, KATEGORI_KS, PERAN_LAB, STATUS_KS, SUMBER_KS, WARNA_DAMPAK_KS, WARNA_STATUS_KS } from "@/lib/lab";
import { hariIniWib, tanggalPanjang, waktuWib } from "@/lib/format";
import FormTambahKs from "./form-tambah-ks";
import AksiKs from "./aksi-ks";

type Ks = {
  id: string;
  no_ks: string;
  tanggal: string;
  kategori: string;
  sumber: string | null;
  uraian: string;
  dampak: string;
  tindakan_segera: string | null;
  penyebab: string | null;
  tindakan_korektif: string | null;
  penanggung_jawab: string | null;
  tenggat: string | null;
  verifikasi: string | null;
  status: string;
  dilaporkan_oleh_nama: string | null;
  ditutup_oleh_nama: string | null;
  ditutup_pada: string | null;
};

const BOBOT_DAMPAK: Record<string, number> = { tinggi: 0, sedang: 1, rendah: 2 };

export default async function HalamanKetidaksesuaianLab({ searchParams }: { searchParams: { status?: string } }) {
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
  const { data, error } = await supabase
    .from("lab_ketidaksesuaian")
    .select("*")
    .order("tanggal", { ascending: false })
    .order("dibuat_pada", { ascending: false })
    .range(0, 1999);
  if (error) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Gagal memuat laporan: {error.message}
        {error.message.includes("lab_ketidaksesuaian") && " — jalankan migrasi_tahap_49.sql di Supabase dulu."}
      </div>
    );
  }

  const semua = (data ?? []) as Ks[];
  const aktif = semua.filter((k) => k.status !== "ditutup");
  const telat = (k: Ks) => k.status !== "ditutup" && !!k.tenggat && k.tenggat < hariIni;
  const jumlahTelat = aktif.filter(telat).length;
  const tinggiTerbuka = aktif.filter((k) => k.dampak === "tinggi").length;
  const bulanIni = hariIni.slice(0, 7);
  const ditutupBulanIni = semua.filter((k) => k.status === "ditutup" && (k.ditutup_pada ?? "").startsWith(bulanIni)).length;

  const tampil = searchParams.status === "ditutup" ? semua.filter((k) => k.status === "ditutup") : aktif;
  const urut = [...tampil].sort((a, b) => {
    if (a.status !== "ditutup" && b.status !== "ditutup") {
      return (
        Number(telat(b)) - Number(telat(a)) ||
        BOBOT_DAMPAK[a.dampak] - BOBOT_DAMPAK[b.dampak] ||
        a.tanggal.localeCompare(b.tanggal)
      );
    }
    return 0;
  });

  const tabCls = (aktifTab: boolean) =>
    `rounded-sm px-3 py-1.5 text-xs font-semibold ${aktifTab ? "bg-teal-700 text-white" : "border border-sand-100 text-ink/70"}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Ketidaksesuaian &amp; Tindakan Korektif</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Catat kejadian tidak sesuai di lab (QC ditolak, sampel salah, alat bermasalah, hasil PME buruk, dan lain-lain),
          analisis penyebabnya, lakukan tindakan korektif, lalu tutup setelah terbukti efektif. Laporan tidak bisa dihapus.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Masih terbuka</p>
          <p className="mt-1 text-3xl font-extrabold text-ink">{aktif.length}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Lewat tenggat</p>
          <p className={`mt-1 text-3xl font-extrabold ${jumlahTelat > 0 ? "text-red-600" : "text-ink"}`}>{jumlahTelat}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Dampak tinggi terbuka</p>
          <p className={`mt-1 text-3xl font-extrabold ${tinggiTerbuka > 0 ? "text-red-600" : "text-ink"}`}>{tinggiTerbuka}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Ditutup bulan ini</p>
          <p className="mt-1 text-3xl font-extrabold text-teal-700">{ditutupBulanIni}</p>
        </div>
      </div>

      {kelola && <FormTambahKs hariIni={hariIni} />}

      <div className="flex gap-2">
        <a href="/dashboard/lab/ketidaksesuaian" className={tabCls(searchParams.status !== "ditutup")}>
          Terbuka ({aktif.length})
        </a>
        <a href="/dashboard/lab/ketidaksesuaian?status=ditutup" className={tabCls(searchParams.status === "ditutup")}>
          Ditutup ({semua.length - aktif.length})
        </a>
      </div>

      <div className="space-y-4">
        {urut.map((k) => (
          <section key={k.id} className={`space-y-3 rounded-card border bg-white p-5 ${telat(k) || (k.dampak === "tinggi" && k.status !== "ditutup") ? "border-red-500/40" : "border-sand-100"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-extrabold text-ink">
                  {k.no_ks} <span className="text-sm font-medium text-ink/45">{KATEGORI_KS[k.kategori]}</span>
                </p>
                <p className="text-xs text-ink/55">
                  {tanggalPanjang(k.tanggal)}
                  {k.sumber ? ` · Sumber: ${SUMBER_KS[k.sumber]}` : ""}
                  {k.dilaporkan_oleh_nama ? ` · ${k.dilaporkan_oleh_nama}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {telat(k) && <span className="rounded-sm bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">Lewat tenggat</span>}
                <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${WARNA_DAMPAK_KS[k.dampak]}`}>Dampak {DAMPAK_KS[k.dampak].toLowerCase()}</span>
                <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${WARNA_STATUS_KS[k.status]}`}>{STATUS_KS[k.status]}</span>
              </div>
            </div>

            <p className="whitespace-pre-line text-sm text-ink/80">{k.uraian}</p>

            <div className="space-y-1 text-sm text-ink/70">
              {k.tindakan_segera && (
                <p>
                  <span className="font-bold">Tindakan segera:</span> {k.tindakan_segera}
                </p>
              )}
              {k.penyebab && (
                <p>
                  <span className="font-bold">Penyebab:</span> {k.penyebab}
                </p>
              )}
              {k.tindakan_korektif && (
                <p>
                  <span className="font-bold">Tindakan korektif:</span> {k.tindakan_korektif}
                  {k.penanggung_jawab ? ` (PJ: ${k.penanggung_jawab})` : ""}
                  {k.tenggat ? ` · tenggat ${tanggalPanjang(k.tenggat)}` : ""}
                </p>
              )}
              {k.verifikasi && (
                <p>
                  <span className="font-bold">Verifikasi:</span> {k.verifikasi}
                </p>
              )}
              {k.status === "ditutup" && k.ditutup_pada && (
                <p className="text-xs text-ink/45">
                  Ditutup {waktuWib(k.ditutup_pada)}
                  {k.ditutup_oleh_nama ? ` oleh ${k.ditutup_oleh_nama}` : ""}
                </p>
              )}
            </div>

            {kelola && (
              <AksiKs
                id={k.id}
                status={k.status}
                penyebab={k.penyebab}
                tindakan={k.tindakan_korektif}
                penanggungJawab={k.penanggung_jawab}
                tenggat={k.tenggat}
              />
            )}
          </section>
        ))}
        {urut.length === 0 && (
          <div className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/45">
            {searchParams.status === "ditutup" ? "Belum ada laporan yang ditutup." : "Tidak ada ketidaksesuaian yang terbuka."}
          </div>
        )}
      </div>
    </div>
  );
}
