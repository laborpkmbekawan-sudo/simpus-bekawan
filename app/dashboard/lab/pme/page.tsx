import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import { EVALUASI_PME, PERAN_LAB, STATUS_PME, WARNA_EVALUASI_PME } from "@/lib/lab";
import { hariIniWib, selisihHari, tanggalPanjang } from "@/lib/format";
import FormTambahPme from "./form-tambah-pme";
import AksiPme from "./aksi-pme";

type Pme = {
  id: string;
  penyelenggara: string;
  program: string | null;
  siklus: string;
  nama_parameter: string;
  satuan: string | null;
  jenis: string;
  tanggal_terima: string;
  batas_lapor: string | null;
  tanggal_dilaporkan: string | null;
  nilai_lab: number | null;
  nilai_target: number | null;
  sd_peserta: number | null;
  sdi: number | null;
  hasil_lab: string | null;
  hasil_benar: string | null;
  skor: number | null;
  evaluasi: string | null;
  status: string;
  tindak_lanjut: string | null;
  catatan: string | null;
};

function fmt(n: number) {
  return String(Math.round(n * 1000) / 1000).replace(".", ",");
}

export default async function HalamanPmeLab() {
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
    .from("lab_pme")
    .select("*")
    .order("tanggal_terima", { ascending: false })
    .order("dibuat_pada", { ascending: false })
    .range(0, 999);
  if (error) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Gagal memuat PME: {error.message}
        {error.message.includes("lab_pme") && " — jalankan migrasi_tahap_49.sql di Supabase dulu."}
      </div>
    );
  }

  const semua = (data ?? []) as Pme[];
  const tahunIni = hariIni.slice(0, 4);
  const berjalan = semua.filter((p) => p.status !== "dievaluasi");
  const telat = berjalan.filter((p) => p.status === "diterima" && p.batas_lapor && p.batas_lapor < hariIni).length;
  const tahunan = semua.filter((p) => p.status === "dievaluasi" && p.tanggal_terima.startsWith(tahunIni));
  const memuaskan = tahunan.filter((p) => p.evaluasi === "memuaskan").length;
  const tidakMemuaskan = tahunan.filter((p) => p.evaluasi === "tidak_memuaskan").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Pemantapan Mutu Eksternal (PME)</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Catat siklus PME dari penyelenggara: sampel diterima, hasil lab dilaporkan, lalu hasil evaluasi masuk. SDI dan
          penilaian dihitung otomatis. Hasil tidak memuaskan wajib ditindaklanjuti.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Siklus berjalan</p>
          <p className="mt-1 text-3xl font-extrabold text-ink">{berjalan.length}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Lewat batas lapor</p>
          <p className={`mt-1 text-3xl font-extrabold ${telat > 0 ? "text-red-600" : "text-ink"}`}>{telat}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Memuaskan tahun {tahunIni}</p>
          <p className="mt-1 text-3xl font-extrabold text-teal-700">
            {memuaskan}
            <span className="text-base font-medium text-ink/45"> / {tahunan.length}</span>
          </p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Tidak memuaskan tahun {tahunIni}</p>
          <p className={`mt-1 text-3xl font-extrabold ${tidakMemuaskan > 0 ? "text-red-600" : "text-ink"}`}>{tidakMemuaskan}</p>
        </div>
      </div>

      {kelola && <FormTambahPme hariIni={hariIni} />}

      <div className="space-y-4">
        {semua.map((p) => {
          const sisa = p.batas_lapor ? selisihHari(hariIni, p.batas_lapor) : null;
          const lewat = p.status === "diterima" && sisa != null && sisa < 0;
          return (
            <section key={p.id} className={`space-y-4 rounded-card border bg-white p-5 ${lewat || p.evaluasi === "tidak_memuaskan" ? "border-red-500/40" : "border-sand-100"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold text-ink">
                    {p.nama_parameter} <span className="text-sm font-medium text-ink/45">{p.siklus}</span>
                  </p>
                  <p className="text-xs text-ink/55">
                    {p.penyelenggara}
                    {p.program ? ` · ${p.program}` : ""} · {p.jenis === "kuantitatif" ? "Kuantitatif" : "Kualitatif"}
                  </p>
                  <p className="text-xs text-ink/45">
                    Sampel diterima {tanggalPanjang(p.tanggal_terima)}
                    {p.batas_lapor ? ` · Batas lapor ${tanggalPanjang(p.batas_lapor)}` : ""}
                    {p.tanggal_dilaporkan ? ` · Dilaporkan ${tanggalPanjang(p.tanggal_dilaporkan)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {lewat && <span className="rounded-sm bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">Lewat batas lapor {Math.abs(sisa ?? 0)} hari</span>}
                  <span className="rounded-sm bg-sand-100 px-2.5 py-1 text-xs font-semibold text-ink/70">{STATUS_PME[p.status]}</span>
                  {p.evaluasi && (
                    <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${WARNA_EVALUASI_PME[p.evaluasi]}`}>{EVALUASI_PME[p.evaluasi]}</span>
                  )}
                </div>
              </div>

              {p.status !== "diterima" && (
                <div className="grid gap-2 rounded-sm bg-[#FBFDFF] px-3 py-2 text-sm sm:grid-cols-4">
                  {p.jenis === "kuantitatif" ? (
                    <>
                      <p>
                        <span className="block text-xs text-ink/45">Hasil lab</span>
                        <span className="font-bold text-ink">
                          {p.nilai_lab != null ? fmt(Number(p.nilai_lab)) : "—"} {p.satuan ?? ""}
                        </span>
                      </p>
                      <p>
                        <span className="block text-xs text-ink/45">Target ± SD</span>
                        <span className="font-bold text-ink">
                          {p.nilai_target != null ? `${fmt(Number(p.nilai_target))} ± ${p.sd_peserta != null ? fmt(Number(p.sd_peserta)) : "—"}` : "Belum ada"}
                        </span>
                      </p>
                      <p>
                        <span className="block text-xs text-ink/45">SDI</span>
                        <span className="font-bold text-ink">
                          {p.sdi != null ? `${Number(p.sdi) > 0 ? "+" : ""}${fmt(Number(p.sdi))}` : "—"}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        <span className="block text-xs text-ink/45">Hasil lab</span>
                        <span className="font-bold text-ink">{p.hasil_lab ?? "—"}</span>
                      </p>
                      <p>
                        <span className="block text-xs text-ink/45">Hasil benar</span>
                        <span className="font-bold text-ink">{p.hasil_benar ?? "Belum ada"}</span>
                      </p>
                    </>
                  )}
                  {p.skor != null && (
                    <p>
                      <span className="block text-xs text-ink/45">Skor penyelenggara</span>
                      <span className="font-bold text-ink">{fmt(Number(p.skor))}</span>
                    </p>
                  )}
                </div>
              )}

              {p.tindak_lanjut && (
                <p className="text-sm text-ink/70">
                  <span className="font-bold">Tindak lanjut:</span> {p.tindak_lanjut}
                </p>
              )}
              {p.catatan && <p className="text-xs text-ink/55">{p.catatan}</p>}

              {kelola && <AksiPme id={p.id} status={p.status} jenis={p.jenis} satuan={p.satuan} hariIni={hariIni} />}
            </section>
          );
        })}
        {semua.length === 0 && (
          <div className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/45">
            Belum ada siklus PME. Catat siklus pertama saat sampel dari penyelenggara diterima.
          </div>
        )}
      </div>
    </div>
  );
}
