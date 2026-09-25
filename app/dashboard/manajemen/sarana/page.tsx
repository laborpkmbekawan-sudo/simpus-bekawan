import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormTambahAset from "./form-tambah";
import BarisAset, { type AsetBaris } from "./baris-aset";

const PERAN_LIHAT = ["admin", "kapus", "manajemen"];

export default async function HalamanSaranaPrasarana() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LIHAT.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau manajemen.
      </div>
    );
  }

  const supabase = createClient();

  const [{ data: asetMentah }, { data: lokasiMentah }] = await Promise.all([
    supabase
      .from("sarana_prasarana")
      .select(
        "id, nama_aset, kategori, lokasi_id, kondisi, tanggal_pemeriksaan, tindak_lanjut, status_perbaikan"
      )
      .order("dibuat_pada", { ascending: false }),
    supabase.from("lokasi").select("id, nama").order("urutan", { ascending: true }),
  ]);

  const daftarLokasi = lokasiMentah ?? [];
  const petaLokasi = new Map(daftarLokasi.map((l) => [l.id, l.nama]));
  const daftarAset = (asetMentah ?? []) as AsetBaris[];

  const rusakBerat = daftarAset.filter((a) => a.kondisi === "rusak_berat");
  const rusakRingan = daftarAset.filter((a) => a.kondisi === "rusak_ringan");
  const perluTindakLanjut = daftarAset.filter(
    (a) => a.status_perbaikan === "menunggu" || a.status_perbaikan === "proses"
  );

  const kartu = [
    { label: "Total Aset", nilai: daftarAset.length },
    { label: "Rusak Ringan", nilai: rusakRingan.length, warna: "text-amber-700" },
    { label: "Rusak Berat", nilai: rusakBerat.length, warna: "text-clay-700" },
    { label: "Dalam Tindak Lanjut", nilai: perluTindakLanjut.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Sarana & Prasarana</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Register aset bangunan, alat kesehatan, kendaraan, dan utilitas beserta kondisi dan tindak lanjut perbaikan.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {kartu.map((k) => (
          <div key={k.label} className="rounded-card border border-sand-100 bg-white p-4">
            <p className="text-xs font-medium text-ink/50">{k.label}</p>
            <p className={`mt-1 text-xl font-extrabold ${k.warna ?? "text-ink"}`}>{k.nilai}</p>
          </div>
        ))}
      </div>

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-4 text-base font-bold text-ink">Catat Aset Baru</h2>
        <FormTambahAset daftarLokasi={daftarLokasi} />
      </section>

      <div className="space-y-3">
        <p className="text-sm font-bold text-ink">Register Sarana & Prasarana</p>
        {daftarAset.map((a) => (
          <BarisAset key={a.id} aset={a} namaLokasi={a.lokasi_id ? petaLokasi.get(a.lokasi_id) ?? "—" : "—"} />
        ))}
        {daftarAset.length === 0 && (
          <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">
            Belum ada aset tercatat.
          </p>
        )}
      </div>
    </div>
  );
}
