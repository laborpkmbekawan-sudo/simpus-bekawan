import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormTambahRisiko from "./form-tambah";
import BarisRisiko, { type Pegawai, type RisikoBaris } from "./baris-risiko";

const PERAN_LIHAT = ["admin", "kapus", "manajemen"];

export default async function HalamanManajemenRisiko() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LIHAT.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau manajemen.
      </div>
    );
  }

  const supabase = createClient();

  const [{ data: daftarRisikoMentah }, { data: daftarPegawaiMentah }] = await Promise.all([
    supabase
      .from("risiko_manajemen")
      .select("id, kategori, uraian, penyebab, level_risiko, rencana_mitigasi, status, penanggung_jawab_id")
      .order("dibuat_pada", { ascending: false }),
    supabase.from("pegawai").select("id, nama_lengkap").eq("status_aktif", true).order("nama_lengkap"),
  ]);

  const daftarRisiko = (daftarRisikoMentah ?? []) as unknown as RisikoBaris[];
  const daftarPegawai = (daftarPegawaiMentah ?? []) as unknown as Pegawai[];

  const kartu = [
    { label: "Total Risiko Tercatat", nilai: daftarRisiko.length },
    { label: "Risiko Tinggi", nilai: daftarRisiko.filter((r) => r.level_risiko === "tinggi").length, warna: "text-clay-700" },
    { label: "Dalam Mitigasi", nilai: daftarRisiko.filter((r) => r.status === "dalam_mitigasi").length },
    { label: "Terkendali", nilai: daftarRisiko.filter((r) => r.status === "terkendali").length, warna: "text-teal-700" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Manajemen Risiko</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Register risiko: identifikasi sebelum kejadian, level, penanggung jawab, dan rencana mitigasi.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kartu.map((k) => (
          <div key={k.label} className="rounded-card border border-sand-100 bg-white p-4">
            <p className="text-xs font-medium text-ink/50">{k.label}</p>
            <p className={`mt-1 text-xl font-extrabold ${k.warna ?? "text-ink"}`}>{k.nilai}</p>
          </div>
        ))}
      </div>

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-4 text-base font-bold text-ink">Tambah Risiko ke Register</h2>
        <FormTambahRisiko />
      </section>

      <div className="space-y-3">
        <p className="text-sm font-bold text-ink">Register Risiko</p>
        {daftarRisiko.map((r) => (
          <BarisRisiko key={r.id} risiko={r} daftarPegawai={daftarPegawai} />
        ))}
        {daftarRisiko.length === 0 && (
          <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">
            Belum ada risiko tercatat di register.
          </p>
        )}
      </div>
    </div>
  );
}
