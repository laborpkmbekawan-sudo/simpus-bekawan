import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { geserHari, hariIniWib } from "@/lib/format";

type PasienRingkas = { id: string; no_rm: string; nama_lengkap: string };

type ProlanisMentah = {
  tanggal_kontrol: string;
  jenis_penyakit: string;
  td_sistolik: number | null;
  td_diastolik: number | null;
  gula_darah_puasa: number | null;
  gula_darah_sewaktu: number | null;
  kepatuhan_obat: string;
  pasien: PasienRingkas | null;
};

type BarisKohort = {
  pasienId: string;
  noRm: string;
  nama: string;
  jenisPenyakit: string;
  tanggalKontrolTerakhir: string;
  tdTerakhir: string | null;
  gdTerakhir: number | null;
  kepatuhanTerakhir: string;
  jumlahKontrolSetahun: number;
};

const LABEL_PENYAKIT: Record<string, string> = {
  hipertensi: "Hipertensi",
  diabetes_melitus: "Diabetes Melitus",
  keduanya: "Hipertensi & Diabetes",
};

const AMBANG_KETERATURAN = 6; // target longgar: minimal 6x kontrol dalam setahun terakhir buat dianggap "teratur"

export default async function KohortRegisterKlaster3() {
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
  // Jendela setahun terakhir: peserta yang gak kontrol sama sekali dalam
  // setahun otomatis hilang dari register, dianggap gak aktif lagi.
  const mulaiSetahun = geserHari(hariIni, -364);

  const { data: kontrolMentah } = await supabase
    .from("kontrol_prolanis")
    .select("tanggal_kontrol, jenis_penyakit, td_sistolik, td_diastolik, gula_darah_puasa, gula_darah_sewaktu, kepatuhan_obat, pasien:pasien_id (id, no_rm, nama_lengkap)")
    .eq("dibatalkan", false)
    .gte("tanggal_kontrol", mulaiSetahun)
    .lte("tanggal_kontrol", hariIni)
    .order("tanggal_kontrol", { ascending: true })
    .limit(5000);

  // Satu baris terbaru per pasien + hitung total kontrol setahun buat
  // status keteraturan. Bukan status resmi BPJS Kesehatan, cuma penanda
  // internal berdasarkan frekuensi kontrol yang tercatat di sistem ini.
  const peta = new Map<string, BarisKohort>();
  const hitungSetahun = new Map<string, number>();
  for (const row of (kontrolMentah ?? []) as unknown as ProlanisMentah[]) {
    const pasien = row.pasien;
    if (!pasien) continue;
    hitungSetahun.set(pasien.id, (hitungSetahun.get(pasien.id) ?? 0) + 1);
    peta.set(pasien.id, {
      pasienId: pasien.id,
      noRm: pasien.no_rm,
      nama: pasien.nama_lengkap,
      jenisPenyakit: row.jenis_penyakit,
      tanggalKontrolTerakhir: row.tanggal_kontrol,
      tdTerakhir: row.td_sistolik && row.td_diastolik ? `${row.td_sistolik}/${row.td_diastolik}` : null,
      gdTerakhir: row.gula_darah_sewaktu ?? row.gula_darah_puasa,
      kepatuhanTerakhir: row.kepatuhan_obat,
      jumlahKontrolSetahun: hitungSetahun.get(pasien.id) ?? 1,
    });
  }

  const kohort = [...peta.values()].sort((a, b) => b.tanggalKontrolTerakhir.localeCompare(a.tanggalKontrolTerakhir));
  const jumlahTeratur = kohort.filter((k) => k.jumlahKontrolSetahun >= AMBANG_KETERATURAN).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Kohort & Register Prolanis — {klaster3.nama}</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Satu baris per peserta, diambil dari kontrol Prolanis dalam 1 tahun terakhir. Peserta yang gak kontrol sama
          sekali dalam setahun otomatis gak muncul lagi.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-sand-100 bg-white p-4">
          <p className="text-xs font-medium text-ink/50">Peserta Aktif</p>
          <p className="mt-1 text-xl font-extrabold text-ink">{kohort.length}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-4">
          <p className="text-xs font-medium text-ink/50">Kontrol Teratur (≥{AMBANG_KETERATURAN}x/tahun)</p>
          <p className="mt-1 text-xl font-extrabold text-teal-700">{jumlahTeratur}</p>
        </div>
        <div className="rounded-card border border-sand-100 bg-white p-4">
          <p className="text-xs font-medium text-ink/50">Belum Teratur</p>
          <p className="mt-1 text-xl font-extrabold text-clay-700">{kohort.length - jumlahTeratur}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-4 py-2.5 font-medium">No. RM</th>
              <th className="px-4 py-2.5 font-medium">Nama</th>
              <th className="px-4 py-2.5 font-medium">Jenis</th>
              <th className="px-4 py-2.5 font-medium">Kontrol Terakhir</th>
              <th className="px-4 py-2.5 font-medium">TD / GD Terakhir</th>
              <th className="px-4 py-2.5 font-medium">Kepatuhan Terakhir</th>
              <th className="px-4 py-2.5 font-medium">Frekuensi Setahun</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {kohort.map((k) => {
              const teratur = k.jumlahKontrolSetahun >= AMBANG_KETERATURAN;
              return (
                <tr key={k.pasienId} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-2.5 text-ink/70">{k.noRm}</td>
                  <td className="px-4 py-2.5 font-medium text-ink">{k.nama}</td>
                  <td className="px-4 py-2.5 text-ink/70">{LABEL_PENYAKIT[k.jenisPenyakit] ?? k.jenisPenyakit}</td>
                  <td className="px-4 py-2.5 text-ink/70">{k.tanggalKontrolTerakhir}</td>
                  <td className="px-4 py-2.5 text-ink/70">
                    {k.tdTerakhir ?? "—"} / {k.gdTerakhir ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-ink/70">
                    {k.kepatuhanTerakhir === "patuh" ? "Patuh" : "Tidak Patuh"}
                  </td>
                  <td className="px-4 py-2.5 text-ink/70">{k.jumlahKontrolSetahun}x</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
                        teratur ? "bg-teal-700/10 text-teal-700" : "bg-clay-600/10 text-clay-700"
                      }`}
                    >
                      {teratur ? "Teratur" : "Belum Teratur"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {kohort.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-ink/45">
                  Belum ada peserta Prolanis dalam 1 tahun terakhir.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
