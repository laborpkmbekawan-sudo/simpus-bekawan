import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormLaporMutu from "./form-lapor";
import BarisTindakLanjut, { type InsidenMutu, type Pegawai } from "./baris-tindak-lanjut";

export default async function HalamanMutu() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  const bisaKelola = ["admin", "kapus"].includes(pemanggil.peran);
  const supabase = createClient();

  const [{ data: daftarInsidenMentah }, { data: daftarPegawaiMentah }] = await Promise.all([
    supabase
      .from("mutu_insiden")
      .select(
        "id, tanggal, jenis, uraian, tingkat_risiko, tindakan_awal, penanggung_jawab_id, batas_waktu, status_tindak_lanjut, bukti_penyelesaian, pelapor:pelapor_id (nama_lengkap)"
      )
      .order("tanggal", { ascending: false })
      .limit(100),
    bisaKelola
      ? supabase.from("pegawai").select("id, nama_lengkap").eq("status_aktif", true).order("nama_lengkap")
      : Promise.resolve({ data: [] }),
  ]);

  const daftarInsiden = (daftarInsidenMentah ?? []) as unknown as InsidenMutu[];
  const daftarPegawai = (daftarPegawaiMentah ?? []) as unknown as Pegawai[];

  const indikator = [
    {
      label: "Baru",
      nilai: daftarInsiden.filter((i) => i.status_tindak_lanjut === "baru").length,
    },
    {
      label: "Diproses",
      nilai: daftarInsiden.filter((i) => i.status_tindak_lanjut === "proses").length,
    },
    {
      label: "Selesai",
      nilai: daftarInsiden.filter((i) => i.status_tindak_lanjut === "selesai").length,
    },
    {
      label: "Risiko tinggi belum selesai",
      nilai: daftarInsiden.filter((i) => i.tingkat_risiko === "tinggi" && i.status_tindak_lanjut !== "selesai")
        .length,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Mutu & Keselamatan Pasien</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Catat insiden, keluhan, dan ketidaklengkapan rekam medis. Siapa saja boleh lapor; admin/kapus yang kelola
          tindak lanjutnya.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {indikator.map((k) => (
          <div key={k.label} className="rounded-card border border-sand-100 bg-white p-4">
            <p className="text-xs font-medium text-ink/50">{k.label}</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{k.nilai}</p>
          </div>
        ))}
      </div>

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-4 text-base font-bold text-ink">Lapor Kejadian Baru</h2>
        <FormLaporMutu />
      </section>

      <div className="space-y-3">
        <p className="text-sm font-bold text-ink">Daftar Laporan</p>
        {daftarInsiden.map((i) => (
          <BarisTindakLanjut key={i.id} insiden={i} daftarPegawai={daftarPegawai} bisaKelola={bisaKelola} />
        ))}
        {daftarInsiden.length === 0 && (
          <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">
            Belum ada laporan mutu tercatat.
          </p>
        )}
      </div>
    </div>
  );
}
