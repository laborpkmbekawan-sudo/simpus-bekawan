import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { hariIniWib, selisihHari } from "@/lib/format";
import FormTambahDokumenOrganisasi, { LABEL_JENIS_DOKUMEN } from "./form-tambah";

const PERAN_LIHAT = ["admin", "kapus", "manajemen"];

type Dokumen = {
  id: string;
  jenis: string;
  judul: string;
  nomor: string | null;
  tanggal_kedaluwarsa: string | null;
  status: string;
  catatan: string | null;
};

export default async function HalamanDokumenAkreditasi() {
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

  const { data: daftarDokumenMentah } = await supabase
    .from("dokumen_organisasi")
    .select("id, jenis, judul, nomor, tanggal_kedaluwarsa, status, catatan")
    .order("tanggal_kedaluwarsa", { ascending: true, nullsFirst: false });

  const daftarDokumen = (daftarDokumenMentah ?? []) as Dokumen[];

  const perluPerhatian = daftarDokumen.filter(
    (d) => d.tanggal_kedaluwarsa && selisihHari(hariIni, d.tanggal_kedaluwarsa) <= 60
  );
  const sudahKedaluwarsa = daftarDokumen.filter(
    (d) => d.tanggal_kedaluwarsa && selisihHari(hariIni, d.tanggal_kedaluwarsa) < 0
  ).length;

  const kartu = [
    { label: "Total Dokumen", nilai: daftarDokumen.length },
    { label: "Mau/Sudah Kedaluwarsa (≤60 hari)", nilai: perluPerhatian.length, warna: "text-amber-700" },
    { label: "Sudah Kedaluwarsa", nilai: sudahKedaluwarsa, warna: "text-clay-700" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Dokumen & Akreditasi</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Arsip metadata dokumen organisasi (kebijakan/SOP/pedoman/dst). Berkas fisik dikelola di luar sistem, di sini
          cuma pencatatan status &amp; tanggal review/kedaluwarsa.
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
        <h2 className="mb-4 text-base font-bold text-ink">Tambah Dokumen</h2>
        <FormTambahDokumenOrganisasi />
      </section>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-4 py-3 font-medium">Jenis</th>
              <th className="px-4 py-3 font-medium">Judul</th>
              <th className="px-4 py-3 font-medium">Nomor</th>
              <th className="px-4 py-3 font-medium">Kedaluwarsa/Review</th>
            </tr>
          </thead>
          <tbody>
            {daftarDokumen.map((d) => {
              const sisa = d.tanggal_kedaluwarsa ? selisihHari(hariIni, d.tanggal_kedaluwarsa) : null;
              return (
                <tr key={d.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-3 text-ink/70">{LABEL_JENIS_DOKUMEN[d.jenis] ?? d.jenis}</td>
                  <td className="px-4 py-3 text-ink">{d.judul}</td>
                  <td className="px-4 py-3 text-ink/70">{d.nomor ?? "—"}</td>
                  <td className="px-4 py-3">
                    {d.tanggal_kedaluwarsa ? (
                      <span
                        className={
                          sisa !== null && sisa < 0
                            ? "font-semibold text-clay-700"
                            : sisa !== null && sisa <= 60
                              ? "font-semibold text-amber-700"
                              : "text-ink/70"
                        }
                      >
                        {d.tanggal_kedaluwarsa}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {daftarDokumen.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-ink/45">
                  Belum ada dokumen tercatat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
