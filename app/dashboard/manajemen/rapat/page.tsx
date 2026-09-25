import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormTambahRapat, { LABEL_JENIS_RAPAT } from "./form-tambah-rapat";
import FormTambahTindakLanjut, { type PegawaiRingkas } from "./form-tambah-tindak-lanjut";
import BarisTindakLanjutRapat, { type TindakLanjutBaris } from "./baris-tindak-lanjut";

const PERAN_LIHAT = ["admin", "kapus", "manajemen"];

type Rapat = {
  id: string;
  tanggal: string;
  jenis: string;
  judul: string;
  notulen: string | null;
};

export default async function HalamanRapat() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LIHAT.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau manajemen.
      </div>
    );
  }

  const supabase = createClient();

  const [{ data: daftarRapatMentah }, { data: semuaTindakLanjutMentah }, { data: daftarPegawaiMentah }] =
    await Promise.all([
      supabase.from("rapat").select("id, tanggal, jenis, judul, notulen").order("tanggal", { ascending: false }).limit(30),
      supabase
        .from("rapat_tindak_lanjut")
        .select("id, rapat_id, uraian, batas_waktu, status, bukti_penyelesaian, penanggung_jawab:penanggung_jawab_id (nama_lengkap)")
        .order("dibuat_pada", { ascending: true }),
      supabase.from("pegawai").select("id, nama_lengkap").eq("status_aktif", true).order("nama_lengkap"),
    ]);

  const daftarRapat = (daftarRapatMentah ?? []) as Rapat[];
  const semuaTindakLanjut = (semuaTindakLanjutMentah ?? []) as unknown as (TindakLanjutBaris & { rapat_id: string })[];
  const daftarPegawai = (daftarPegawaiMentah ?? []) as unknown as PegawaiRingkas[];

  const tindakLanjutBelumSelesai = semuaTindakLanjut.filter((t) => t.status !== "selesai").length;
  const tindakLanjutTerlambat = semuaTindakLanjut.filter(
    (t) => t.status !== "selesai" && t.batas_waktu && t.batas_waktu < new Date().toISOString().slice(0, 10)
  ).length;

  const kartu = [
    { label: "Rapat Tercatat", nilai: daftarRapat.length },
    { label: "Tindak Lanjut Belum Selesai", nilai: tindakLanjutBelumSelesai },
    { label: "Tindak Lanjut Terlambat", nilai: tindakLanjutTerlambat, warna: "text-clay-700" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Rapat & Tindak Lanjut</h1>
        <p className="mt-1.5 text-sm text-ink/60">Notulen rapat internal dan matriks tindak lanjutnya.</p>
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
        <h2 className="mb-4 text-base font-bold text-ink">Catat Rapat Baru</h2>
        <FormTambahRapat />
      </section>

      <div className="space-y-4">
        {daftarRapat.map((r) => {
          const tindakLanjutRapatIni = semuaTindakLanjut.filter((t) => t.rapat_id === r.id);
          return (
            <div key={r.id} className="rounded-card border border-sand-100 bg-white p-5">
              <p className="text-xs font-medium text-ink/50">
                {r.tanggal} · {LABEL_JENIS_RAPAT[r.jenis] ?? r.jenis}
              </p>
              <p className="mt-0.5 text-base font-bold text-ink">{r.judul}</p>
              {r.notulen && <p className="mt-2 whitespace-pre-line text-sm text-ink/70">{r.notulen}</p>}

              <div className="mt-4 space-y-2 border-t border-sand-100 pt-4">
                <p className="text-xs font-bold text-ink/60">Tindak Lanjut</p>
                {tindakLanjutRapatIni.map((t) => (
                  <BarisTindakLanjutRapat key={t.id} item={t} />
                ))}
                {tindakLanjutRapatIni.length === 0 && (
                  <p className="text-xs text-ink/40">Belum ada tindak lanjut buat rapat ini.</p>
                )}
                <div className="pt-2">
                  <FormTambahTindakLanjut rapatId={r.id} daftarPegawai={daftarPegawai} />
                </div>
              </div>
            </div>
          );
        })}
        {daftarRapat.length === 0 && (
          <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">Belum ada rapat tercatat.</p>
        )}
      </div>
    </div>
  );
}
