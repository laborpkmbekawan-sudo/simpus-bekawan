import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import { PERAN_LAB, STATUS_QC, WARNA_STATUS_QC } from "@/lib/lab";
import { hariIniWib, geserHari, waktuWib } from "@/lib/format";
import FormTambahKontrol, { type OpsiParameterQc } from "./form-tambah-kontrol";
import FormInputQc from "./form-input-qc";
import GrafikLj from "./grafik-lj";

type Kontrol = {
  id: string;
  nama: string;
  level: string | null;
  lot: string | null;
  satuan: string | null;
  target: number;
  sd: number;
  aktif: boolean;
  parameter: { nama: string; pemeriksaan: { nama: string } | null } | null;
};

type HasilQc = {
  id: string;
  kontrol_id: string;
  tanggal: string;
  nilai: number;
  z: number;
  status: string;
  catatan: string | null;
  dicatat_oleh_nama: string | null;
  dicatat_pada: string;
};

const MAKS_TITIK = 30;

function fmt(n: number) {
  return String(Math.round(n * 1000) / 1000).replace(".", ",");
}

export default async function HalamanQcLab() {
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

  const [{ data: kontrolMentah, error }, { data: parameterMentah }] = await Promise.all([
    supabase
      .from("lab_qc_kontrol")
      .select("id, nama, level, lot, satuan, target, sd, aktif, parameter:parameter_id (nama, pemeriksaan:pemeriksaan_id (nama))")
      .order("aktif", { ascending: false })
      .order("nama"),
    supabase
      .from("lab_parameter")
      .select("id, nama, pemeriksaan:pemeriksaan_id (nama)")
      .eq("tipe", "angka")
      .eq("aktif", true)
      .order("nama"),
  ]);

  if (error) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Gagal memuat kontrol mutu: {error.message}
        {error.message.includes("lab_qc_kontrol") && " — jalankan migrasi_tahap_47.sql di Supabase dulu."}
      </div>
    );
  }

  const daftarKontrol = (kontrolMentah ?? []) as unknown as Kontrol[];
  const opsiParameter: OpsiParameterQc[] = (
    (parameterMentah ?? []) as unknown as { id: string; nama: string; pemeriksaan: { nama: string } | null }[]
  ).map((p) => ({ id: p.id, label: `${p.pemeriksaan?.nama ?? "—"} · ${p.nama}` }));

  const idKontrol = daftarKontrol.map((k) => k.id);
  const { data: hasilMentah } = idKontrol.length
    ? await supabase
        .from("lab_qc_hasil")
        .select("id, kontrol_id, tanggal, nilai, z, status, catatan, dicatat_oleh_nama, dicatat_pada")
        .in("kontrol_id", idKontrol)
        .gte("tanggal", geserHari(hariIni, -90))
        .order("dicatat_pada", { ascending: false })
        .range(0, 2999)
    : { data: [] };

  const perKontrol = new Map<string, HasilQc[]>();
  for (const h of (hasilMentah ?? []) as unknown as HasilQc[]) {
    const arr = perKontrol.get(h.kontrol_id) ?? [];
    arr.push(h); // urutan: terbaru dulu
    perKontrol.set(h.kontrol_id, arr);
  }

  const aktif = daftarKontrol.filter((k) => k.aktif);
  const statusHariIni = (k: Kontrol) => (perKontrol.get(k.id) ?? []).find((h) => h.tanggal === hariIni) ?? null;
  const sudahQc = aktif.filter((k) => statusHariIni(k)).length;
  const belumQc = aktif.length - sudahQc;
  const bermasalah = aktif.filter((k) => {
    const s = statusHariIni(k)?.status;
    return s === "ditolak" || s === "peringatan";
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Kontrol Mutu Lab (QC)</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Catat QC harian sebelum memeriksa sampel pasien. Status dihitung otomatis dari target dan SD: lebih dari 2 SD
          peringatan, lebih dari 3 SD ditolak. Catatan QC tidak bisa diubah, koreksi dengan catatan baru.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Bahan kontrol aktif</p>
          <p className="mt-1 text-3xl font-extrabold text-ink">{aktif.length}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Sudah QC hari ini</p>
          <p className="mt-1 text-3xl font-extrabold text-teal-700">{sudahQc}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Belum QC hari ini</p>
          <p className={`mt-1 text-3xl font-extrabold ${belumQc > 0 ? "text-clay-700" : "text-ink"}`}>{belumQc}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Peringatan / ditolak</p>
          <p className={`mt-1 text-3xl font-extrabold ${bermasalah > 0 ? "text-red-600" : "text-ink"}`}>{bermasalah}</p>
        </div>
      </div>

      {kelola && <FormTambahKontrol daftarParameter={opsiParameter} />}

      <div className="space-y-4">
        {daftarKontrol.map((k) => {
          const semua = perKontrol.get(k.id) ?? [];
          const hariIniHasil = statusHariIni(k);
          const titik = [...semua].slice(0, MAKS_TITIK).reverse().map((h) => ({ z: Number(h.z), status: h.status }));
          return (
            <section key={k.id} className={`space-y-4 rounded-card border bg-white p-5 ${k.aktif ? "border-sand-100" : "border-sand-100 opacity-70"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold text-ink">
                    {k.nama}
                    {k.level ? <span className="ml-2 text-sm font-medium text-ink/50">{k.level}</span> : null}
                    {!k.aktif && <span className="ml-2 rounded-sm bg-ink/5 px-2 py-0.5 text-xs font-semibold text-ink/50">Nonaktif</span>}
                  </p>
                  <p className="text-xs text-ink/55">
                    Target {fmt(Number(k.target))} ± {fmt(Number(k.sd))} SD{k.satuan ? ` ${k.satuan}` : ""}
                    {k.lot ? ` · Lot ${k.lot}` : ""}
                    {k.parameter ? ` · Menjaga ${k.parameter.pemeriksaan?.nama ?? "—"} · ${k.parameter.nama}` : ""}
                  </p>
                  <p className="text-xs text-ink/45">
                    Rentang 2 SD: {fmt(Number(k.target) - 2 * Number(k.sd))} – {fmt(Number(k.target) + 2 * Number(k.sd))} · 3 SD:{" "}
                    {fmt(Number(k.target) - 3 * Number(k.sd))} – {fmt(Number(k.target) + 3 * Number(k.sd))}
                  </p>
                </div>
                {k.aktif && (
                  <span
                    className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${
                      hariIniHasil ? WARNA_STATUS_QC[hariIniHasil.status] : "bg-clay-600/10 text-clay-700"
                    }`}
                  >
                    {hariIniHasil ? `Hari ini: ${STATUS_QC[hariIniHasil.status]}` : "Belum QC hari ini"}
                  </span>
                )}
              </div>

              <GrafikLj titik={titik} />

              {kelola && <FormInputQc id={k.id} aktif={k.aktif} satuan={k.satuan} />}

              {semua.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-xs font-semibold text-teal-700">Riwayat terbaru ({Math.min(semua.length, 10)} dari {semua.length})</summary>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                          <th className="py-2 pr-4 font-medium">Waktu</th>
                          <th className="py-2 pr-4 font-medium">Nilai</th>
                          <th className="py-2 pr-4 font-medium">SD</th>
                          <th className="py-2 pr-4 font-medium">Status</th>
                          <th className="py-2 font-medium">Dicatat oleh</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semua.slice(0, 10).map((h) => (
                          <tr key={h.id} className="border-b border-sand-100/70 last:border-0">
                            <td className="whitespace-nowrap py-2 pr-4 text-ink/70">{waktuWib(h.dicatat_pada)}</td>
                            <td className="py-2 pr-4 text-ink">{fmt(Number(h.nilai))}</td>
                            <td className="py-2 pr-4 text-ink/70">
                              {Number(h.z) > 0 ? "+" : ""}
                              {fmt(Number(h.z))}
                            </td>
                            <td className="py-2 pr-4">
                              <span className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${WARNA_STATUS_QC[h.status]}`}>
                                {STATUS_QC[h.status]}
                              </span>
                            </td>
                            <td className="py-2 text-ink/60">
                              {h.dicatat_oleh_nama ?? "—"}
                              {h.catatan ? <span className="block text-xs text-ink/45">{h.catatan}</span> : null}
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
        {daftarKontrol.length === 0 && (
          <div className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/45">
            Belum ada bahan kontrol. Tambahkan dulu dengan target dan SD dari insert kit.
          </div>
        )}
      </div>
    </div>
  );
}
