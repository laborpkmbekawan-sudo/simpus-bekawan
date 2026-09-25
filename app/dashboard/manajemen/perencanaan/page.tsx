import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { rupiah } from "@/lib/format";
import FormTambahKegiatan from "./form-tambah";
import BarisKegiatan, { type Pegawai, type KegiatanBaris } from "./baris-kegiatan";

const PERAN_LIHAT = ["admin", "kapus", "manajemen"];

export default async function HalamanPerencanaan() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LIHAT.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau manajemen.
      </div>
    );
  }

  const supabase = createClient();
  const tahunIni = new Date().getFullYear();

  const [{ data: daftarKegiatanMentah }, { data: daftarPegawaiMentah }] = await Promise.all([
    supabase
      .from("perencanaan_kegiatan")
      .select(
        "id, tahun, jenis, upaya, program, kegiatan, sasaran, volume, jadwal_bulan, sumber_dana, rencana_anggaran, realisasi_anggaran, penanggung_jawab_id, status, catatan"
      )
      .order("tahun", { ascending: false })
      .order("dibuat_pada", { ascending: false }),
    supabase.from("pegawai").select("id, nama_lengkap").eq("status_aktif", true).order("nama_lengkap"),
  ]);

  const daftarKegiatan = (daftarKegiatanMentah ?? []) as KegiatanBaris[];
  const daftarPegawai = (daftarPegawaiMentah ?? []) as unknown as Pegawai[];

  const kegiatanTahunIni = daftarKegiatan.filter((k) => k.tahun === tahunIni);
  const totalRencana = kegiatanTahunIni.reduce((jumlah, k) => jumlah + (k.rencana_anggaran ?? 0), 0);
  const belumSelesai = kegiatanTahunIni.filter((k) => k.status !== "selesai" && k.status !== "ditunda").length;

  const kartu = [
    { label: `Kegiatan Tahun ${tahunIni}`, nilai: kegiatanTahunIni.length },
    { label: "Belum Selesai", nilai: belumSelesai, warna: "text-amber-700" },
    { label: `Total Rencana Anggaran ${tahunIni}`, nilai: rupiah(totalRencana) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Perencanaan</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Register RUK (usulan tahunan) dan RPK (pelaksanaan bulanan): program, sumber dana, status persetujuan dan realisasi.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kartu.map((k) => (
          <div key={k.label} className="rounded-card border border-sand-100 bg-white p-4">
            <p className="text-xs font-medium text-ink/50">{k.label}</p>
            <p className={`mt-1 text-xl font-extrabold ${k.warna ?? "text-ink"}`}>{k.nilai}</p>
          </div>
        ))}
      </div>

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-4 text-base font-bold text-ink">Catat Kegiatan Baru</h2>
        <FormTambahKegiatan />
      </section>

      <div className="space-y-3">
        <p className="text-sm font-bold text-ink">Register Kegiatan</p>
        {daftarKegiatan.map((k) => (
          <BarisKegiatan key={k.id} kegiatan={k} daftarPegawai={daftarPegawai} />
        ))}
        {daftarKegiatan.length === 0 && (
          <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">Belum ada kegiatan perencanaan tercatat.</p>
        )}
      </div>
    </div>
  );
}
