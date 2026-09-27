import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { geserHari, hariIniWib } from "@/lib/format";

type KunjunganHariIni = {
  id: string;
  nomor_antrian: number;
  status: "menunggu" | "dipanggil" | "selesai";
  jenis_kunjungan: string;
  pasien: { nama_lengkap: string } | null;
};

type PosbinduPerhatian = {
  tanggal: string;
  faktor_risiko: string | null;
  tindak_lanjut: string | null;
  pasien: { nama_lengkap: string } | null;
};

type ProlanisPerhatian = {
  tanggal_kontrol: string;
  jenis_penyakit: string;
  keluhan: string | null;
  pasien: { nama_lengkap: string } | null;
};

const LABEL_STATUS: Record<string, string> = {
  menunggu: "Menunggu",
  dipanggil: "Dipanggil",
  selesai: "Selesai",
};

const LABEL_PENYAKIT: Record<string, string> = {
  hipertensi: "Hipertensi",
  diabetes_melitus: "Diabetes Melitus",
  keduanya: "Hipertensi & Diabetes",
};

export default async function DashboardKlaster3() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  const supabase = createClient();
  const { data: klaster3 } = await supabase.from("klaster").select("id, nama").eq("kode", "klaster_3").maybeSingle();

  if (!klaster3) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Klaster dengan kode "klaster_3" belum ada di Master Data.
      </div>
    );
  }

  let bolehLihat = ["admin", "kapus"].includes(pemanggil.peran);
  if (!bolehLihat) {
    const { data: akses } = await supabase
      .from("akses_klaster")
      .select("id")
      .eq("pegawai_id", pemanggil.id)
      .eq("klaster_id", klaster3.id)
      .maybeSingle();
    bolehLihat = !!akses;
  }

  if (!bolehLihat) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau pegawai dengan akses Klaster 3.
      </div>
    );
  }

  const hariIni = hariIniWib();
  const mulaiRolling = geserHari(hariIni, -89); // jendela 90 hari buat "Perlu Perhatian"

  const [
    { data: kunjunganHariIniMentah },
    { count: jumlahPosbinduHariIni },
    { count: jumlahProlanisHariIni },
    { data: posbinduPerhatianMentah },
    { data: prolanisPerhatianMentah },
  ] = await Promise.all([
    supabase
      .from("kunjungan")
      .select("id, nomor_antrian, status, jenis_kunjungan, pasien:pasien_id (nama_lengkap)")
      .eq("klaster_tujuan_id", klaster3.id)
      .eq("tanggal", hariIni)
      .order("nomor_antrian", { ascending: true }),
    supabase
      .from("kegiatan_posbindu_ptm")
      .select("id", { count: "exact", head: true })
      .eq("tanggal", hariIni)
      .eq("dibatalkan", false),
    supabase
      .from("kontrol_prolanis")
      .select("id", { count: "exact", head: true })
      .eq("tanggal_kontrol", hariIni)
      .eq("dibatalkan", false),
    supabase
      .from("kegiatan_posbindu_ptm")
      .select("tanggal, faktor_risiko, tindak_lanjut, pasien:pasien_id (nama_lengkap)")
      .eq("hasil_skrining", "perlu_rujukan")
      .eq("dibatalkan", false)
      .gte("tanggal", mulaiRolling)
      .lte("tanggal", hariIni)
      .order("tanggal", { ascending: false })
      .limit(10),
    supabase
      .from("kontrol_prolanis")
      .select("tanggal_kontrol, jenis_penyakit, keluhan, pasien:pasien_id (nama_lengkap)")
      .eq("kepatuhan_obat", "tidak_patuh")
      .eq("dibatalkan", false)
      .gte("tanggal_kontrol", mulaiRolling)
      .lte("tanggal_kontrol", hariIni)
      .order("tanggal_kontrol", { ascending: false })
      .limit(10),
  ]);

  const kunjunganHariIni = (kunjunganHariIniMentah ?? []) as unknown as KunjunganHariIni[];
  const posbinduPerhatian = (posbinduPerhatianMentah ?? []) as unknown as PosbinduPerhatian[];
  const prolanisPerhatian = (prolanisPerhatianMentah ?? []) as unknown as ProlanisPerhatian[];

  const antreanAktif = kunjunganHariIni.filter((k) => k.status !== "selesai");
  const selesaiHariIni = kunjunganHariIni.filter((k) => k.status === "selesai").length;

  const agenda = [
    { label: "Kunjungan Klaster 3 Hari Ini", nilai: kunjunganHariIni.length },
    { label: "Kegiatan Posbindu PTM Hari Ini", nilai: jumlahPosbinduHariIni ?? 0 },
    { label: "Kontrol Prolanis Hari Ini", nilai: jumlahProlanisHariIni ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Dashboard Klaster 3 — {klaster3.nama}</h1>
        <p className="mt-1.5 text-sm text-ink/60">Ringkasan hari ini. Data langsung, bukan rekap periode.</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Agenda Pelayanan Hari Ini</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {agenda.map((a) => (
            <div key={a.label} className="rounded-card border border-sand-100 bg-white p-4">
              <p className="text-xs font-medium text-ink/50">{a.label}</p>
              <p className="mt-1 text-xl font-extrabold text-ink">{a.nilai}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink/50">
          {antreanAktif.length} kunjungan masih dalam antrean, {selesaiHariIni} sudah selesai hari ini.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Perlu Perhatian (90 hari terakhir)</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-card border border-sand-100 bg-white p-4">
            <p className="text-xs font-medium text-ink/50">Skrining Posbindu Perlu Rujukan</p>
            <p className="mt-1 text-xl font-extrabold text-clay-700">{posbinduPerhatian.length}</p>
          </div>
          <div className="rounded-card border border-sand-100 bg-white p-4">
            <p className="text-xs font-medium text-ink/50">Peserta Prolanis Tidak Patuh Obat</p>
            <p className="mt-1 text-xl font-extrabold text-clay-700">{prolanisPerhatian.length}</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">Antrean Aktif Klaster 3</p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-4 py-2.5 font-medium">No.</th>
              <th className="px-4 py-2.5 font-medium">Pasien</th>
              <th className="px-4 py-2.5 font-medium">Jenis</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {antreanAktif.map((k) => (
              <tr key={k.id} className="border-b border-sand-100/70 last:border-0">
                <td className="px-4 py-2.5 text-ink/70">{k.nomor_antrian}</td>
                <td className="px-4 py-2.5 text-ink">{k.pasien?.nama_lengkap ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink/70">{k.jenis_kunjungan}</td>
                <td className="px-4 py-2.5 text-ink/70">{LABEL_STATUS[k.status]}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    href={`/dashboard/pelayanan/${k.id}`}
                    className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
                  >
                    Buka Pelayanan
                  </Link>
                </td>
              </tr>
            ))}
            {antreanAktif.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-ink/45">
                  Tidak ada antrean aktif ke Klaster 3 hari ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">
            Skrining Posbindu Perlu Rujukan
          </p>
          <div className="space-y-2 p-3">
            {posbinduPerhatian.map((p, idx) => (
              <div key={idx} className="rounded-sm border border-sand-100 p-3 text-sm">
                <p className="font-semibold text-ink">{p.pasien?.nama_lengkap ?? "—"}</p>
                <p className="text-xs text-ink/50">
                  {p.tanggal}
                  {p.faktor_risiko ? ` · ${p.faktor_risiko}` : ""}
                  {p.tindak_lanjut ? ` · ${p.tindak_lanjut}` : ""}
                </p>
              </div>
            ))}
            {posbinduPerhatian.length === 0 && (
              <p className="px-1 py-6 text-center text-sm text-ink/45">
                Tidak ada skrining yang perlu rujukan 90 hari terakhir.
              </p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">
            Peserta Prolanis Tidak Patuh Obat
          </p>
          <div className="space-y-2 p-3">
            {prolanisPerhatian.map((p, idx) => (
              <div key={idx} className="rounded-sm border border-sand-100 p-3 text-sm">
                <p className="font-semibold text-ink">{p.pasien?.nama_lengkap ?? "—"}</p>
                <p className="text-xs text-ink/50">
                  {p.tanggal_kontrol} · {LABEL_PENYAKIT[p.jenis_penyakit] ?? p.jenis_penyakit}
                  {p.keluhan ? ` · ${p.keluhan}` : ""}
                </p>
              </div>
            ))}
            {prolanisPerhatian.length === 0 && (
              <p className="px-1 py-6 text-center text-sm text-ink/45">
                Tidak ada peserta tidak patuh obat 90 hari terakhir.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
