import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import {
  HASIL_LOG_ALAT,
  JENIS_LOG_ALAT,
  KONDISI_ALAT,
  PERAN_LAB,
  WARNA_HASIL_LOG_ALAT,
  WARNA_KONDISI_ALAT,
  WARNA_STATUS_JADWAL,
  statusJadwal,
  type StatusJadwal,
} from "@/lib/lab";
import { hariIniWib, tanggalPanjang } from "@/lib/format";
import FormTambahAlat from "./form-tambah-alat";
import FormLogAlat from "./form-log-alat";

type Alat = {
  id: string;
  nama: string;
  merk: string | null;
  tipe: string | null;
  no_seri: string | null;
  lokasi: string | null;
  tanggal_pengadaan: string | null;
  kondisi: string;
  interval_kalibrasi_hari: number | null;
  interval_pemeliharaan_hari: number | null;
  kalibrasi_terakhir: string | null;
  kalibrasi_berikutnya: string | null;
  pemeliharaan_terakhir: string | null;
  pemeliharaan_berikutnya: string | null;
  catatan: string | null;
};

type LogAlat = {
  id: string;
  alat_id: string;
  jenis: string;
  tanggal: string;
  hasil: string;
  pelaksana: string | null;
  no_sertifikat: string | null;
  catatan: string | null;
  dicatat_oleh_nama: string | null;
};

function teksJadwal(j: { status: StatusJadwal; sisaHari: number | null }, berikutnya: string | null): string {
  switch (j.status) {
    case "tidak_dijadwalkan":
      return "Tanpa jadwal";
    case "belum_pernah":
      return "Belum pernah dicatat";
    case "terlambat":
      return `Terlambat ${Math.abs(j.sisaHari ?? 0)} hari`;
    case "segera":
      return j.sisaHari === 0 ? "Jatuh tempo hari ini" : `${j.sisaHari} hari lagi`;
    default:
      return berikutnya ? `Berikutnya ${tanggalPanjang(berikutnya)}` : "Aman";
  }
}

function BarisJadwal({ judul, terakhir, berikutnya, j }: { judul: string; terakhir: string | null; berikutnya: string | null; j: { status: StatusJadwal; sisaHari: number | null } }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm bg-[#FBFDFF] px-3 py-2 text-sm">
      <div>
        <p className="font-bold text-ink">{judul}</p>
        <p className="text-xs text-ink/55">
          Terakhir: {terakhir ? tanggalPanjang(terakhir) : "—"}
          {berikutnya && j.status !== "aman" ? ` · Jatuh tempo ${tanggalPanjang(berikutnya)}` : ""}
        </p>
      </div>
      <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${WARNA_STATUS_JADWAL[j.status]}`}>{teksJadwal(j, berikutnya)}</span>
    </div>
  );
}

const BOBOT: Record<StatusJadwal, number> = { terlambat: 0, belum_pernah: 1, segera: 2, aman: 3, tidak_dijadwalkan: 4 };

export default async function HalamanAlatLab() {
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
  const { data: alatMentah, error } = await supabase.from("lab_alat").select("*").order("nama");
  if (error) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Gagal memuat data alat: {error.message}
        {error.message.includes("lab_alat") && " — jalankan migrasi_tahap_48.sql di Supabase dulu."}
      </div>
    );
  }

  const daftarAlat = (alatMentah ?? []) as Alat[];
  const idAlat = daftarAlat.map((a) => a.id);
  const { data: logMentah } = idAlat.length
    ? await supabase
        .from("lab_alat_log")
        .select("id, alat_id, jenis, tanggal, hasil, pelaksana, no_sertifikat, catatan, dicatat_oleh_nama")
        .in("alat_id", idAlat)
        .order("tanggal", { ascending: false })
        .order("dicatat_pada", { ascending: false })
        .range(0, 1999)
    : { data: [] };

  const logPerAlat = new Map<string, LogAlat[]>();
  for (const l of (logMentah ?? []) as LogAlat[]) {
    const arr = logPerAlat.get(l.alat_id) ?? [];
    arr.push(l);
    logPerAlat.set(l.alat_id, arr);
  }

  const diolah = daftarAlat.map((a) => ({
    a,
    kal: statusJadwal(a.interval_kalibrasi_hari, a.kalibrasi_berikutnya, hariIni),
    pem: statusJadwal(a.interval_pemeliharaan_hari, a.pemeliharaan_berikutnya, hariIni),
  }));
  const berjalan = diolah.filter((d) => d.a.kondisi !== "nonaktif");
  const kalTelat = berjalan.filter((d) => d.kal.status === "terlambat" || d.kal.status === "belum_pernah").length;
  const pemTelat = berjalan.filter((d) => d.pem.status === "terlambat" || d.pem.status === "belum_pernah").length;
  const bermasalah = berjalan.filter((d) => d.a.kondisi === "rusak" || d.a.kondisi === "perlu_perbaikan").length;

  // Yang butuh perhatian paling atas, alat nonaktif paling bawah.
  const urut = [...diolah].sort((x, y) => {
    const nx = x.a.kondisi === "nonaktif" ? 1 : 0;
    const ny = y.a.kondisi === "nonaktif" ? 1 : 0;
    if (nx !== ny) return nx - ny;
    const kx = x.a.kondisi === "rusak" ? 0 : x.a.kondisi === "perlu_perbaikan" ? 1 : 2;
    const ky = y.a.kondisi === "rusak" ? 0 : y.a.kondisi === "perlu_perbaikan" ? 1 : 2;
    if (kx !== ky) return kx - ky;
    return Math.min(BOBOT[x.kal.status], BOBOT[x.pem.status]) - Math.min(BOBOT[y.kal.status], BOBOT[y.pem.status]) || x.a.nama.localeCompare(y.a.nama);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Alat Lab, Kalibrasi &amp; Pemeliharaan</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Register alat laboratorium dengan jadwal kalibrasi dan pemeliharaan. Jadwal berikutnya dihitung otomatis dari
          kegiatan terakhir. Kalibrasi atau pemeliharaan yang gagal menandai alat perlu perbaikan. Log tidak bisa diubah.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Alat berjalan</p>
          <p className="mt-1 text-3xl font-extrabold text-ink">{berjalan.length}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Kalibrasi terlambat / belum ada</p>
          <p className={`mt-1 text-3xl font-extrabold ${kalTelat > 0 ? "text-red-600" : "text-teal-700"}`}>{kalTelat}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Pemeliharaan terlambat / belum ada</p>
          <p className={`mt-1 text-3xl font-extrabold ${pemTelat > 0 ? "text-red-600" : "text-teal-700"}`}>{pemTelat}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Perlu perbaikan / rusak</p>
          <p className={`mt-1 text-3xl font-extrabold ${bermasalah > 0 ? "text-red-600" : "text-ink"}`}>{bermasalah}</p>
        </div>
      </div>

      {kelola && <FormTambahAlat />}

      <div className="space-y-4">
        {urut.map(({ a, kal, pem }) => {
          const log = logPerAlat.get(a.id) ?? [];
          const rincian = [a.merk, a.tipe, a.no_seri ? `No. seri ${a.no_seri}` : null, a.lokasi].filter(Boolean).join(" · ");
          return (
            <section key={a.id} className={`space-y-4 rounded-card border bg-white p-5 ${a.kondisi === "nonaktif" ? "border-sand-100 opacity-70" : a.kondisi === "rusak" ? "border-red-500/40" : "border-sand-100"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold text-ink">{a.nama}</p>
                  {rincian && <p className="text-xs text-ink/55">{rincian}</p>}
                  {a.tanggal_pengadaan && <p className="text-xs text-ink/45">Pengadaan {tanggalPanjang(a.tanggal_pengadaan)}</p>}
                  {a.catatan && <p className="mt-1 text-xs text-ink/55">{a.catatan}</p>}
                </div>
                <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${WARNA_KONDISI_ALAT[a.kondisi]}`}>{KONDISI_ALAT[a.kondisi]}</span>
              </div>

              {(a.kondisi === "rusak" || a.kondisi === "perlu_perbaikan") && (
                <p className="rounded-sm bg-red-600/10 px-3 py-2 text-xs font-semibold text-red-700">
                  Jangan dipakai untuk sampel pasien sampai diperbaiki dan QC diulang.
                </p>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <BarisJadwal judul="Kalibrasi" terakhir={a.kalibrasi_terakhir} berikutnya={a.kalibrasi_berikutnya} j={kal} />
                <BarisJadwal judul="Pemeliharaan rutin" terakhir={a.pemeliharaan_terakhir} berikutnya={a.pemeliharaan_berikutnya} j={pem} />
              </div>

              {kelola && <FormLogAlat alatId={a.id} kondisi={a.kondisi} hariIni={hariIni} />}

              {log.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-xs font-semibold text-teal-700">
                    Riwayat kegiatan ({Math.min(log.length, 10)} dari {log.length})
                  </summary>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                          <th className="py-2 pr-4 font-medium">Tanggal</th>
                          <th className="py-2 pr-4 font-medium">Jenis</th>
                          <th className="py-2 pr-4 font-medium">Hasil</th>
                          <th className="py-2 font-medium">Pelaksana / catatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {log.slice(0, 10).map((l) => (
                          <tr key={l.id} className="border-b border-sand-100/70 last:border-0">
                            <td className="whitespace-nowrap py-2 pr-4 text-ink/70">{tanggalPanjang(l.tanggal)}</td>
                            <td className="py-2 pr-4 text-ink">{JENIS_LOG_ALAT[l.jenis] ?? l.jenis}</td>
                            <td className="py-2 pr-4">
                              <span className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${WARNA_HASIL_LOG_ALAT[l.hasil]}`}>{HASIL_LOG_ALAT[l.hasil] ?? l.hasil}</span>
                            </td>
                            <td className="py-2 text-ink/60">
                              {l.pelaksana ?? l.dicatat_oleh_nama ?? "—"}
                              {l.no_sertifikat ? <span className="block text-xs text-ink/45">Sertifikat {l.no_sertifikat}</span> : null}
                              {l.catatan ? <span className="block text-xs text-ink/45">{l.catatan}</span> : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </section>
          );
        })}
        {daftarAlat.length === 0 && (
          <div className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/45">
            Belum ada alat. Tambahkan alat lab beserta interval kalibrasi dan pemeliharaannya.
          </div>
        )}
      </div>
    </div>
  );
}
