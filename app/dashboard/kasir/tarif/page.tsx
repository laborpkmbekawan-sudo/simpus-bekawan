import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormTambahTarif from "./form-tambah-tarif";
import FormImporTarif from "./form-impor-tarif";
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
  const [{ data: daftarTarif }, { data: daftarKlaster }] = await Promise.all([
    supabase
      .from("tarif_layanan")
      .select("id, nama_layanan, harga, aktif, kategori, klaster:klaster_terkait_id (nama)")
      .order("kategori", { ascending: true })
      .order("nama_layanan", { ascending: true }),
    supabase.from("klaster").select("id, nama").order("urutan", { ascending: true }),
  ]);

  const perKategori = new Map<string, typeof daftarTarif>();
  for (const t of daftarTarif ?? []) {
    const daftar = perKategori.get(t.kategori) ?? [];
    daftar.push(t);
    perKategori.set(t.kategori, daftar as typeof daftarTarif);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Tarif & Tindakan</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Master harga layanan yang dipakai kasir dan checklist tindakan di rekam medis.
        </p>
      </div>

      <FormTambahTarif daftarKlaster={daftarKlaster ?? []} />
      <FormImporTarif />

      {[...perKategori.entries()].map(([kategori, daftar]) => (
        <div key={kategori}>
          <p className="mb-2 text-sm font-bold text-ink">{kategori}</p>
          <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                  <th className="px-5 py-3 font-medium">Nama Layanan</th>
                  <th className="px-5 py-3 font-medium">Harga</th>
                  <th className="px-5 py-3 font-medium">Klaster</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">BHP</th>
                </tr>
              </thead>
              <tbody>
                {(daftar ?? []).map((t) => (
                  <tr key={t.id} className="border-b border-sand-100/70 last:border-0">
                    <td className="px-5 py-3.5 text-ink">{t.nama_layanan}</td>
                    <td className="px-5 py-3.5 text-ink/70">{formatRupiah(Number(t.harga))}</td>
                    <td className="px-5 py-3.5 text-ink/60">
                      {(t.klaster as unknown as { nama: string } | null)?.nama ?? "Semua klaster"}
                    </td>
                    <td className="px-5 py-3.5">
                      <ToggleTarif tarifId={t.id} aktif={t.aktif} />
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/dashboard/kasir/tarif/${t.id}/bhp`}
                        className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
                      >
                        Atur BHP
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {(!daftarTarif || daftarTarif.length === 0) && (
        <p className="rounded-card border border-sand-100 bg-white px-5 py-8 text-center text-sm text-ink/45">
          Belum ada tarif layanan.
        </p>
      )}
    </div>
  );
}
