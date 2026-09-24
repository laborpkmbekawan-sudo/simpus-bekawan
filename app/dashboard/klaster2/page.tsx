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

type IbuBerisiko = {
  usia_kehamilan_minggu: number | null;
  faktor_risiko: string | null;
  kunjungan: { id: string; tanggal: string; pasien: { nama_lengkap: string } | null } | null;
};

type AnakPantau = {
  status_gizi: string | null;
  status_tumbuh_kembang: string | null;
  kunjungan: { id: string; tanggal: string; pasien: { nama_lengkap: string } | null } | null;
};

const LABEL_STATUS: Record<string, string> = {
  menunggu: "Menunggu",
  dipanggil: "Dipanggil",
  selesai: "Selesai",
};

export default async function DashboardKlaster2() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  const supabase = createClient();
  const { data: klaster2 } = await supabase.from("klaster").select("id, nama").eq("kode", "klaster_2").maybeSingle();

  if (!klaster2) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Klaster dengan kode "klaster_2" belum ada di Master Data.
      </div>
    );
  }

  let bolehLihat = ["admin", "kapus"].includes(pemanggil.peran);
  if (!bolehLihat) {
    const { data: akses } = await supabase
      .from("akses_klaster")
      .select("id")
      .eq("pegawai_id", pemanggil.id)
      .eq("klaster_id", klaster2.id)
      .maybeSingle();
    bolehLihat = !!akses;
  }

  if (!bolehLihat) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau pegawai dengan akses Klaster 2.
      </div>
    );
  }

  const hariIni = hariIniWib();
  const mulaiRolling = geserHari(hariIni, -89); // jendela 90 hari buat "Perlu Perhatian"

  const { data: kunjunganHariIniMentah } = await supabase
    .from("kunjungan")
    .select("id, nomor_antrian, status, jenis_kunjungan, pasien:pasien_id (nama_lengkap)")
    .eq("klaster_tujuan_id", klaster2.id)
    .eq("tanggal", hariIni)
    .order("nomor_antrian", { ascending: true });

  const kunjunganHariIni = (kunjunganHariIniMentah ?? []) as unknown as KunjunganHariIni[];
  const idHariIni = kunjunganHariIni.map((k) => k.id);

  const { data: kunjunganRollingMentah } = await supabase
    .from("kunjungan")
    .select("id")
    .eq("klaster_tujuan_id", klaster2.id)
    .gte("tanggal", mulaiRolling)
    .lte("tanggal", hariIni)
    .limit(3000);
  const idRolling = (kunjunganRollingMentah ?? []).map((k) => k.id);

  const [
    { count: jumlahAnc },
    { count: jumlahAnak },
    { data: skriningHariIniMentah },
    { count: jumlahImunisasi },
    { data: ibuBerisikoMentah },
    { data: anakPantauMentah },
    { count: jumlahMutuBelumSelesai },
  ] = await Promise.all([
    idHariIni.length
      ? supabase.from("pelayanan_ibu").select("id", { count: "exact", head: true }).in("kunjungan_id", idHariIni)
      : Promise.resolve({ count: 0 }),
    idHariIni.length
      ? supabase.from("pelayanan_anak").select("id", { count: "exact", head: true }).in("kunjungan_id", idHariIni)
      : Promise.resolve({ count: 0 }),
    idHariIni.length
      ? supabase
          .from("skrining_klaster2")
          .select("jenis_skrining")
          .in("kunjungan_id", idHariIni)
          .eq("dibatalkan", false)
      : Promise.resolve({ data: [] }),
    supabase
      .from("pemberian_imunisasi")
      .select("id", { count: "exact", head: true })
      .eq("tanggal_pemberian", hariIni)
      .eq("dibatalkan", false),
    idRolling.length
      ? supabase
          .from("pelayanan_ibu")
          .select(
            "usia_kehamilan_minggu, faktor_risiko, kunjungan:kunjungan_id (id, tanggal, pasien:pasien_id (nama_lengkap))"
          )
          .in("kunjungan_id", idRolling)
          .eq("status_risiko", "tinggi")
          .limit(10)
      : Promise.resolve({ data: [] }),
    idRolling.length
      ? supabase
          .from("pelayanan_anak")
          .select(
            "status_gizi, status_tumbuh_kembang, kunjungan:kunjungan_id (id, tanggal, pasien:pasien_id (nama_lengkap))"
          )
          .in("kunjungan_id", idRolling)
          .limit(200)
      : Promise.resolve({ data: [] }),
    supabase
      .from("mutu_insiden")
      .select("id", { count: "exact", head: true })
      .neq("status_tindak_lanjut", "selesai"),
  ]);

  const ibuBerisiko = (ibuBerisikoMentah ?? []) as unknown as IbuBerisiko[];
  const anakPantauSemua = (anakPantauMentah ?? []) as unknown as AnakPantau[];
  const anakPantau = anakPantauSemua
    .filter(
      (a) => (a.status_tumbuh_kembang && a.status_tumbuh_kembang !== "sesuai") || (a.status_gizi && a.status_gizi !== "gizi_baik")
    )
    .slice(0, 10);

  const perJenisSkrining = new Map<string, number>();
  for (const s of skriningHariIniMentah ?? []) {
    perJenisSkrining.set(s.jenis_skrining, (perJenisSkrining.get(s.jenis_skrining) ?? 0) + 1);
  }
  const jumlahMtbs = (perJenisSkrining.get("mtbs") ?? 0) + (perJenisSkrining.get("mtbm") ?? 0);
  const jumlahSdidtk = perJenisSkrining.get("sdidtk") ?? 0;

  const agenda = [
    { label: "ANC Ibu Hamil", nilai: jumlahAnc ?? 0 },
    { label: "Pelayanan Anak", nilai: jumlahAnak ?? 0 },
    { label: "MTBS/MTBM", nilai: jumlahMtbs },
    { label: "Skrining SDIDTK", nilai: jumlahSdidtk },
    { label: "Imunisasi", nilai: jumlahImunisasi ?? 0 },
  ];

  const antreanAktif = kunjunganHariIni.filter((k) => k.status !== "selesai");
  const selesaiHariIni = kunjunganHariIni.filter((k) => k.status === "selesai").length;

  const perhatian = [
    { label: "Ibu Hamil Risiko Tinggi (90 hari)", nilai: ibuBerisiko.length, warna: "text-clay-700" },
    { label: "Anak Perlu Pemantauan (90 hari)", nilai: anakPantau.length, warna: "text-amber-700" },
    { label: "Insiden Mutu Belum Selesai (semua klaster)", nilai: jumlahMutuBelumSelesai ?? 0, warna: "text-clay-700" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Dashboard Klaster 2 — {klaster2.nama}</h1>
        <p className="mt-1.5 text-sm text-ink/60">Ringkasan hari ini. Data langsung, bukan rekap periode.</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Agenda Pelayanan Hari Ini</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
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
        <p className="mb-2 text-sm font-bold text-ink">Perlu Perhatian</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {perhatian.map((p) => (
            <div key={p.label} className="rounded-card border border-sand-100 bg-white p-4">
              <p className="text-xs font-medium text-ink/50">{p.label}</p>
              <p className={`mt-1 text-xl font-extrabold ${p.warna}`}>{p.nilai}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">Antrean Aktif Klaster 2</p>
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
                  Tidak ada antrean aktif ke Klaster 2 hari ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">Register Ibu Berisiko</p>
          <div className="space-y-2 p-3">
            {ibuBerisiko.map((i, idx) => (
              <div key={idx} className="rounded-sm border border-sand-100 p-3 text-sm">
                <p className="font-semibold text-ink">{i.kunjungan?.pasien?.nama_lengkap ?? "—"}</p>
                <p className="text-xs text-ink/50">
                  {i.kunjungan?.tanggal} · {i.usia_kehamilan_minggu ?? "—"} minggu
                  {i.faktor_risiko ? ` · ${i.faktor_risiko}` : ""}
                </p>
              </div>
            ))}
            {ibuBerisiko.length === 0 && (
              <p className="px-1 py-6 text-center text-sm text-ink/45">Tidak ada ibu risiko tinggi 90 hari terakhir.</p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">Daftar Pemantauan Anak</p>
          <div className="space-y-2 p-3">
            {anakPantau.map((a, idx) => (
              <div key={idx} className="rounded-sm border border-sand-100 p-3 text-sm">
                <p className="font-semibold text-ink">{a.kunjungan?.pasien?.nama_lengkap ?? "—"}</p>
                <p className="text-xs text-ink/50">
                  {a.kunjungan?.tanggal} · Gizi: {a.status_gizi ?? "—"} · Tumbuh kembang: {a.status_tumbuh_kembang ?? "—"}
                </p>
              </div>
            ))}
            {anakPantau.length === 0 && (
              <p className="px-1 py-6 text-center text-sm text-ink/45">Tidak ada anak perlu pemantauan 90 hari terakhir.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
