import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { KATEGORI_LAB, PERAN_KLINIS_LAB, PERAN_LAB, teksRujukan, type ParameterLab } from "@/lib/lab";
import FormTambahPemeriksaan from "./form-tambah-pemeriksaan";
import TogglePemeriksaan from "./toggle-pemeriksaan";
import PilihTarif from "./pilih-tarif";
import type { OpsiTarif } from "./form-tambah-pemeriksaan";

type Pemeriksaan = {
  id: string;
  kode: string | null;
  nama: string;
  kategori: string;
  jenis_sampel: string | null;
  aktif: boolean;
  tarif_layanan_id: string | null;
  tarif: { nama_layanan: string; harga: number } | null;
  parameter: ParameterLab[];
};

function rujukanTampil(p: ParameterLab) {
  const umum = teksRujukan(p, "L");
  const perempuan = p.min_p != null || p.max_p != null ? teksRujukan(p, "P") : "";
  if (!umum && !perempuan) return "—";
  return perempuan ? `L: ${umum || "—"} · P: ${perempuan}` : umum;
}

export default async function HalamanKatalogLab() {
  const pemanggil = await getPegawaiSaya();
  const boleh = pemanggil && [...PERAN_LAB, ...PERAN_KLINIS_LAB, "kapus", "tenaga_gizi"].includes(pemanggil.peran);
  if (!pemanggil || !boleh) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini untuk petugas layanan dan Laboratorium.
      </div>
    );
  }

  const kelola = PERAN_LAB.includes(pemanggil.peran);
  const supabase = createClient();
  const [{ data, error }, { data: tarifMentah }] = await Promise.all([
    supabase
    .from("lab_pemeriksaan")
    .select("id, kode, nama, kategori, jenis_sampel, aktif, tarif_layanan_id, tarif:tarif_layanan_id (nama_layanan, harga), parameter:lab_parameter (id, nama, satuan, tipe, pilihan, pilihan_normal, min_l, max_l, min_p, max_p, urutan, aktif)")
    .order("nama"),
    supabase.from("tarif_layanan").select("id, nama_layanan, harga").eq("aktif", true).order("nama_layanan"),
  ]);
  const daftarTarif = (tarifMentah ?? []) as OpsiTarif[];

  if (error) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Gagal memuat katalog: {error.message}
        {error.message.includes("lab_pemeriksaan") && " — jalankan migrasi_tahap_43.sql lalu migrasi_tahap_44.sql di Supabase dulu."}
      </div>
    );
  }

  const semua = ((data ?? []) as unknown as Pemeriksaan[]).filter((p) => kelola || p.aktif);
  const kategori = [...new Set([...KATEGORI_LAB, ...semua.map((p) => p.kategori)])].filter((k) =>
    semua.some((p) => p.kategori === k)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">{kelola ? "Katalog Pemeriksaan Lab" : "Pemeriksaan Tersedia"}</h1>
          <p className="mt-1.5 text-sm text-ink/60">
            {kelola
              ? "Master paket dan parameter beserta nilai rujukan. Nilai rujukan dipakai untuk menandai hasil rendah/tinggi otomatis."
              : "Daftar pemeriksaan yang bisa diminta ke Laboratorium dari halaman Pelayanan pasien."}
          </p>
        </div>
      </div>

      {kelola && <FormTambahPemeriksaan daftarTarif={daftarTarif} />}

      {kategori.map((k) => (
        <section key={k} className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">{k}</h2>
          <div className="space-y-3">
            {semua
              .filter((p) => p.kategori === k)
              .map((p) => {
                const parameter = [...p.parameter].sort((a, b) => a.urutan - b.urutan);
                return (
                  <details key={p.id} className="rounded-card border border-sand-100 bg-white p-5">
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 list-none">
                      <div>
                        <p className={`text-base font-bold ${p.aktif ? "text-ink" : "text-ink/40"}`}>
                          {p.nama}
                          {p.kode && <span className="ml-2 text-xs font-medium text-ink/40">{p.kode}</span>}
                          {!p.aktif && <span className="ml-2 rounded-sm bg-ink/5 px-2 py-0.5 text-[11px] font-semibold text-ink/50">Nonaktif</span>}
                        </p>
                        <p className="text-xs text-ink/50">
                          {parameter.length} parameter{p.jenis_sampel ? ` · Sampel: ${p.jenis_sampel}` : ""} ·{" "}
                          {p.tarif ? `Tarif: Rp ${Math.round(Number(p.tarif.harga)).toLocaleString("id-ID")}` : "Tidak ditagih"}
                        </p>
                      </div>
                      {kelola && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <TogglePemeriksaan id={p.id} aktif={p.aktif} />
                        </div>
                      )}
                    </summary>
                    {kelola && (
                      <div className="mt-4 rounded-sm border border-sand-100 bg-sand-50 p-3">
                        <p className="mb-2 text-xs font-bold text-ink/70">Tarif kasir (ditagihkan otomatis saat hasil divalidasi)</p>
                        <PilihTarif id={p.id} tarifId={p.tarif_layanan_id} daftarTarif={daftarTarif} />
                      </div>
                    )}
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                            <th className="py-2 pr-4 font-medium">Parameter</th>
                            <th className="py-2 pr-4 font-medium">Tipe</th>
                            <th className="py-2 pr-4 font-medium">Satuan</th>
                            <th className="py-2 font-medium">Nilai rujukan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parameter.map((par) => (
                            <tr key={par.id} className="border-b border-sand-100/70 last:border-0">
                              <td className="py-2 pr-4 text-ink">{par.nama}</td>
                              <td className="py-2 pr-4 capitalize text-ink/60">{par.tipe}</td>
                              <td className="py-2 pr-4 text-ink/60">{par.satuan ?? "—"}</td>
                              <td className="py-2 text-ink/70">
                                {par.tipe === "pilihan"
                                  ? `${(par.pilihan ?? []).join(" / ")}${par.pilihan_normal ? ` (normal: ${par.pilihan_normal})` : ""}`
                                  : rujukanTampil(par)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                );
              })}
          </div>
        </section>
      ))}

      {semua.length === 0 && (
        <div className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/45">
          Katalog masih kosong.
        </div>
      )}
    </div>
  );
}
