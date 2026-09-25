import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormTambahKegiatanIlp from "./form-tambah";
import BarisKegiatanIlp, { type Pegawai, type KegiatanIlpBaris } from "./baris-kegiatan";

const PERAN_LIHAT = ["admin", "kapus", "manajemen"];

export default async function HalamanIlp() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LIHAT.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau manajemen.
      </div>
    );
  }

  const supabase = createClient();

  const [{ data: daftarKegiatanMentah }, { data: daftarPegawaiMentah }] = await Promise.all([
    supabase
      .from("ilp_kegiatan")
      .select(
        "id, tanggal, siklus_hidup, jenis_kegiatan, desa_wilayah, sasaran, capaian, kader_terlibat, kendala, tindak_lanjut, status, penanggung_jawab_id"
      )
      .order("tanggal", { ascending: false }),
    supabase.from("pegawai").select("id, nama_lengkap").eq("status_aktif", true).order("nama_lengkap"),
  ]);

  const daftarKegiatan = (daftarKegiatanMentah ?? []) as KegiatanIlpBaris[];
  const daftarPegawai = (daftarPegawaiMentah ?? []) as unknown as Pegawai[];

  const kegiatanTerbuka = daftarKegiatan.filter((k) => k.status === "terbuka");
  const totalSasaran = daftarKegiatan.reduce((jumlah, k) => jumlah + (k.sasaran ?? 0), 0);
  const totalCapaian = daftarKegiatan.reduce((jumlah, k) => jumlah + (k.capaian ?? 0), 0);

  const kartu = [
    { label: "Total Kegiatan", nilai: daftarKegiatan.length },
    { label: "Kegiatan Terbuka", nilai: kegiatanTerbuka.length, warna: "text-amber-700" },
    { label: "Sasaran vs Capaian", nilai: `${totalCapaian}/${totalSasaran}` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Manajemen ILP</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Integrasi Layanan Primer: register kunjungan rumah, pendataan keluarga sehat, Posyandu Prima, dan PWS per siklus hidup dan wilayah binaan.
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
        <FormTambahKegiatanIlp />
      </section>

      <div className="space-y-3">
        <p className="text-sm font-bold text-ink">Register Kegiatan ILP</p>
        {daftarKegiatan.map((k) => (
          <BarisKegiatanIlp key={k.id} kegiatan={k} daftarPegawai={daftarPegawai} />
        ))}
        {daftarKegiatan.length === 0 && (
          <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">Belum ada kegiatan ILP tercatat.</p>
        )}
      </div>
    </div>
  );
}
