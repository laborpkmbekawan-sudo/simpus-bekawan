import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { awalHariWib, akhirHariWib, hariIniWib } from "@/lib/format";

const PERAN_LIHAT = ["admin", "kapus", "manajemen"];

const LABEL_NILAI: Record<string, string> = {
  sangat_puas: "Sangat puas",
  puas: "Puas",
  cukup: "Cukup",
  kurang_puas: "Kurang puas",
};
const WARNA_STATUS: Record<string, string> = {
  baru: "bg-amber-500/10 text-amber-700",
  proses: "bg-ink/5 text-ink/60",
  selesai: "bg-teal-500/10 text-teal-700",
};

type Keluhan = {
  id: string;
  tanggal: string;
  uraian: string;
  tingkat_risiko: string;
  status_tindak_lanjut: string;
  pelapor: { nama_lengkap: string } | null;
};

export default async function HalamanPengaduanKepuasan() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LIHAT.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau manajemen.
      </div>
    );
  }

  const supabase = createClient();
  const hariIni = hariIniWib();
  const bulanIniMulai = `${hariIni.slice(0, 8)}01`;

  const [{ data: surveiBulanIni }, { data: daftarKeluhanMentah }] = await Promise.all([
    supabase
      .from("survei_kepuasan")
      .select("nilai")
      .gte("dibuat_pada", awalHariWib(bulanIniMulai))
      .lte("dibuat_pada", akhirHariWib(hariIni)),
    supabase
      .from("mutu_insiden")
      .select("id, tanggal, uraian, tingkat_risiko, status_tindak_lanjut, pelapor:pelapor_id (nama_lengkap)")
      .eq("jenis", "keluhan")
      .order("tanggal", { ascending: false })
      .limit(50),
  ]);

  const daftarKeluhan = (daftarKeluhanMentah ?? []) as unknown as Keluhan[];

  const jumlahPerNilai: Record<string, number> = { sangat_puas: 0, puas: 0, cukup: 0, kurang_puas: 0 };
  for (const s of surveiBulanIni ?? []) jumlahPerNilai[s.nilai] = (jumlahPerNilai[s.nilai] ?? 0) + 1;
  const totalSurvei = (surveiBulanIni ?? []).length;
  const persenPuas = totalSurvei
    ? Math.round(((jumlahPerNilai.sangat_puas + jumlahPerNilai.puas) / totalSurvei) * 100)
    : null;

  const keluhanAktif = daftarKeluhan.filter((k) => k.status_tindak_lanjut !== "selesai");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Pengaduan & Kepuasan</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Ringkasan kepuasan pasien bulan ini + daftar keluhan. Kelola tindak lanjut keluhan di halaman Mutu.
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-ink">Kepuasan Pasien Bulan Ini</p>
          <Link
            href="/dashboard/laporan/kepuasan"
            className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
          >
            Lihat laporan lengkap
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-card border border-sand-100 bg-white p-4">
            <p className="text-xs font-medium text-ink/50">Total Respons</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{totalSurvei}</p>
          </div>
          <div className="rounded-card border border-sand-100 bg-white p-4">
            <p className="text-xs font-medium text-ink/50">Puas / Sangat Puas</p>
            <p className="mt-1 text-xl font-extrabold text-teal-700">{persenPuas === null ? "—" : `${persenPuas}%`}</p>
          </div>
          {Object.entries(LABEL_NILAI).map(([nilai, label]) => (
            <div key={nilai} className="rounded-card border border-sand-100 bg-white p-4">
              <p className="text-xs font-medium text-ink/50">{label}</p>
              <p className="mt-1 text-xl font-extrabold text-ink">{jumlahPerNilai[nilai] ?? 0}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <div className="flex items-center justify-between border-b border-sand-100 px-4 py-3">
          <p className="text-sm font-bold text-ink">Keluhan ({keluhanAktif.length} belum selesai)</p>
          <Link
            href="/dashboard/mutu"
            className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
          >
            Kelola tindak lanjut
          </Link>
        </div>
        <div className="divide-y divide-sand-100/70">
          {daftarKeluhan.map((k) => (
            <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="text-sm text-ink">{k.uraian}</p>
                <p className="text-xs text-ink/50">
                  {k.tanggal} · Pelapor: {k.pelapor?.nama_lengkap ?? "—"}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${WARNA_STATUS[k.status_tindak_lanjut]}`}>
                {k.status_tindak_lanjut}
              </span>
            </div>
          ))}
          {daftarKeluhan.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink/45">Belum ada keluhan tercatat.</p>
          )}
        </div>
      </div>
    </div>
  );
}
