import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormLaporanPustu from "./form-laporan";
import BarisLaporan, { type LaporanBaris } from "./baris-laporan";
import FormJejaring from "./form-jejaring";
import BarisJejaring, { type JejaringBaris } from "./baris-jejaring";

const PERAN_LIHAT = ["admin", "kapus", "manajemen"];

export default async function HalamanPustuJejaring() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LIHAT.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau manajemen.
      </div>
    );
  }

  const supabase = createClient();

  const [{ data: lokasiMentah }, { data: laporanMentah }, { data: jejaringMentah }] = await Promise.all([
    supabase.from("lokasi").select("id, nama, tipe").order("urutan", { ascending: true }),
    supabase
      .from("pustu_laporan")
      .select(
        "id, lokasi_id, bulan, jumlah_kunjungan, jumlah_rujukan, status_logistik, kendala, tindak_lanjut, status"
      )
      .order("bulan", { ascending: false }),
    supabase
      .from("jejaring_fasyankes")
      .select("id, nama, jenis, penanggung_jawab, kontak, alamat, status_kerjasama, catatan")
      .order("nama", { ascending: true }),
  ]);

  const daftarLokasi = lokasiMentah ?? [];
  const daftarPustu = daftarLokasi.filter((l) => l.tipe === "pustu");
  const petaLokasi = new Map(daftarLokasi.map((l) => [l.id, l.nama]));

  const daftarLaporan = (laporanMentah ?? []) as LaporanBaris[];
  const daftarJejaring = (jejaringMentah ?? []) as JejaringBaris[];

  const laporanTerbuka = daftarLaporan.filter((l) => l.status !== "selesai");
  const logistikBermasalah = daftarLaporan.filter(
    (l) => l.status !== "selesai" && l.status_logistik !== "aman"
  );

  const kartu = [
    { label: "Pustu Terpantau", nilai: daftarPustu.length },
    { label: "Laporan Terbuka", nilai: laporanTerbuka.length, warna: "text-amber-700" },
    { label: "Logistik Bermasalah", nilai: logistikBermasalah.length, warna: "text-clay-700" },
    { label: "Jejaring Aktif", nilai: daftarJejaring.filter((j) => j.status_kerjasama === "aktif").length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Pustu & Jejaring</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Laporan bulanan operasional Pustu (wilayah pulau/sungai) dan registrasi fasyankes jejaring di wilayah kerja.
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
        <h2 className="mb-4 text-base font-bold text-ink">Catat Laporan Bulanan Pustu</h2>
        <FormLaporanPustu daftarPustu={daftarPustu} />
      </section>

      <div className="space-y-3">
        <p className="text-sm font-bold text-ink">Riwayat Laporan Pustu</p>
        {daftarLaporan.map((l) => (
          <BarisLaporan key={l.id} laporan={l} namaLokasi={petaLokasi.get(l.lokasi_id) ?? "—"} />
        ))}
        {daftarLaporan.length === 0 && (
          <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">
            Belum ada laporan Pustu tercatat.
          </p>
        )}
      </div>

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-4 text-base font-bold text-ink">Daftarkan Fasyankes Jejaring</h2>
        <FormJejaring daftarLokasi={daftarLokasi} />
      </section>

      <div className="space-y-3">
        <p className="text-sm font-bold text-ink">Registrasi Fasyankes Jejaring</p>
        {daftarJejaring.map((j) => (
          <BarisJejaring key={j.id} jejaring={j} />
        ))}
        {daftarJejaring.length === 0 && (
          <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">
            Belum ada fasyankes jejaring terdaftar.
          </p>
        )}
      </div>
    </div>
  );
}
