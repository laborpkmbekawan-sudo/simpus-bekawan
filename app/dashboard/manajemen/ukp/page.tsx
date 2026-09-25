import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormTambahKepatuhanUkp from "./form-tambah";
import BarisKepatuhan, { type Pegawai, type KepatuhanBaris } from "./baris-kepatuhan";

const PERAN_LIHAT = ["admin", "kapus", "manajemen"];

export default async function HalamanUkp() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LIHAT.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau manajemen.
      </div>
    );
  }

  const supabase = createClient();

  const [{ data: daftarKepatuhanMentah }, { data: daftarPegawaiMentah }] = await Promise.all([
    supabase
      .from("ukp_kepatuhan")
      .select(
        "id, tanggal, unit_layanan, aspek_dinilai, skor_kepatuhan, temuan, rekomendasi, penanggung_jawab_id, status_tindak_lanjut, bukti_tindak_lanjut"
      )
      .order("tanggal", { ascending: false }),
    supabase.from("pegawai").select("id, nama_lengkap").eq("status_aktif", true).order("nama_lengkap"),
  ]);

  const daftarKepatuhan = (daftarKepatuhanMentah ?? []) as KepatuhanBaris[];
  const daftarPegawai = (daftarPegawaiMentah ?? []) as unknown as Pegawai[];

  const belumSesuai = daftarKepatuhan.filter((k) => k.status_tindak_lanjut !== "sesuai");
  const skorTerisi = daftarKepatuhan.filter((k) => k.skor_kepatuhan != null);
  const rataSkor = skorTerisi.length
    ? Math.round((skorTerisi.reduce((jumlah, k) => jumlah + (k.skor_kepatuhan ?? 0), 0) / skorTerisi.length) * 10) / 10
    : null;

  const kartu = [
    { label: "Total Penilaian", nilai: daftarKepatuhan.length },
    { label: "Belum Sesuai", nilai: belumSesuai.length, warna: "text-clay-700" },
    { label: "Rata-rata Skor Kepatuhan", nilai: rataSkor != null ? `${rataSkor}%` : "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Manajemen UKP</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Register audit kepatuhan klinis per unit layanan UKP: skor kepatuhan SOP, temuan, dan status tindak lanjut.
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
        <h2 className="mb-4 text-base font-bold text-ink">Catat Penilaian Baru</h2>
        <FormTambahKepatuhanUkp />
      </section>

      <div className="space-y-3">
        <p className="text-sm font-bold text-ink">Register Kepatuhan UKP</p>
        {daftarKepatuhan.map((k) => (
          <BarisKepatuhan key={k.id} kepatuhan={k} daftarPegawai={daftarPegawai} />
        ))}
        {daftarKepatuhan.length === 0 && (
          <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">Belum ada penilaian kepatuhan UKP tercatat.</p>
        )}
      </div>
    </div>
  );
}
