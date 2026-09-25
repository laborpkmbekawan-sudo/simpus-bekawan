import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { hariIniWib } from "@/lib/format";
import FormTambahTemuan from "./form-tambah";
import BarisTemuan, { type Pegawai, type TemuanBaris } from "./baris-temuan";

const PERAN_LIHAT = ["admin", "kapus", "manajemen"];

export default async function HalamanAudit() {
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

  const [{ data: daftarTemuanMentah }, { data: daftarPegawaiMentah }] = await Promise.all([
    supabase
      .from("audit_temuan")
      .select(
        "id, tanggal, jenis_audit, temuan, rekomendasi, batas_waktu, status_kepatuhan, bukti_tindak_lanjut, penanggung_jawab_id"
      )
      .order("tanggal", { ascending: false }),
    supabase.from("pegawai").select("id, nama_lengkap").eq("status_aktif", true).order("nama_lengkap"),
  ]);

  const daftarTemuan = (daftarTemuanMentah ?? []) as TemuanBaris[];
  const daftarPegawai = (daftarPegawaiMentah ?? []) as unknown as Pegawai[];

  const temuanTerbuka = daftarTemuan.filter((t) => t.status_kepatuhan !== "sesuai");
  const temuanTerlambat = daftarTemuan.filter(
    (t) => t.status_kepatuhan !== "sesuai" && t.batas_waktu && t.batas_waktu < hariIni
  );

  const kartu = [
    { label: "Total Temuan", nilai: daftarTemuan.length },
    { label: "Temuan Terbuka", nilai: temuanTerbuka.length, warna: "text-amber-700" },
    { label: "Tindak Lanjut Terlambat", nilai: temuanTerlambat.length, warna: "text-clay-700" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Audit & Pengendalian</h1>
        <p className="mt-1.5 text-sm text-ink/60">Register temuan audit internal, rekomendasi, dan status kepatuhan tindak lanjut.</p>
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
        <h2 className="mb-4 text-base font-bold text-ink">Catat Temuan Baru</h2>
        <FormTambahTemuan />
      </section>

      <div className="space-y-3">
        <p className="text-sm font-bold text-ink">Register Temuan</p>
        {daftarTemuan.map((t) => (
          <BarisTemuan key={t.id} temuan={t} daftarPegawai={daftarPegawai} />
        ))}
        {daftarTemuan.length === 0 && (
          <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">Belum ada temuan audit tercatat.</p>
        )}
      </div>
    </div>
  );
}
