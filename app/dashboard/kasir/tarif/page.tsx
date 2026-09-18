import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormTambahTarif from "./form-tambah-tarif";
import ToggleTarif from "./toggle-tarif";

function formatRupiah(angka: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    angka
  );
}

export default async function HalamanTarif() {
  const pemanggil = await getPegawaiSaya();
  if (pemanggil?.peran !== "admin") {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin.
      </div>
    );
  }

  const supabase = createClient();
  const { data: daftarTarif } = await supabase
    .from("tarif_layanan")
    .select("id, nama_layanan, harga, aktif")
    .order("nama_layanan", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Tarif Layanan</h1>
        <p className="mt-1.5 text-sm text-ink/60">Master harga layanan yang dipakai kasir buat bikin tagihan.</p>
      </div>

      <FormTambahTarif />

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-5 py-3 font-medium">Nama Layanan</th>
              <th className="px-5 py-3 font-medium">Harga</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(daftarTarif ?? []).map((t) => (
              <tr key={t.id} className="border-b border-sand-100/70 last:border-0">
                <td className="px-5 py-3.5 text-ink">{t.nama_layanan}</td>
                <td className="px-5 py-3.5 text-ink/70">{formatRupiah(Number(t.harga))}</td>
                <td className="px-5 py-3.5">
                  <ToggleTarif tarifId={t.id} aktif={t.aktif} />
                </td>
              </tr>
            ))}
            {(!daftarTarif || daftarTarif.length === 0) && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-sm text-ink/45">
                  Belum ada tarif layanan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
