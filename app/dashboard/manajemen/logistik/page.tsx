import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormTambahBarang from "./form-tambah-barang";
import FormMutasi from "./form-mutasi";
import { LABEL_KATEGORI } from "./form-tambah-barang";

const PERAN_LIHAT = ["admin", "kapus", "manajemen"];

export default async function HalamanLogistik() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LIHAT.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau manajemen.
      </div>
    );
  }

  const supabase = createClient();
  const { data: daftarBarang } = await supabase
    .from("logistik_barang")
    .select("id, nama_barang, kategori, satuan, stok_saat_ini, stok_minimum, aktif")
    .order("nama_barang", { ascending: true });

  const menipis = (daftarBarang ?? []).filter((b) => Number(b.stok_saat_ini) <= Number(b.stok_minimum));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Manajemen Logistik</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Stok barang logistik non-medis: ATK, rumah tangga, kebersihan, percetakan. Terpisah dari BHP Farmasi.
        </p>
      </div>

      {menipis.length > 0 && (
        <div className="rounded-card border border-clay-600/30 bg-clay-600/10 p-4">
          <p className="text-sm font-bold text-clay-700">⚠ {menipis.length} barang stoknya menipis</p>
          <p className="mt-1 text-xs text-clay-700">{menipis.map((b) => b.nama_barang).join(", ")}</p>
        </div>
      )}

      <FormTambahBarang />

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-5 py-3 font-medium">Nama Barang</th>
              <th className="px-5 py-3 font-medium">Kategori</th>
              <th className="px-5 py-3 font-medium">Stok Saat Ini</th>
              <th className="px-5 py-3 font-medium">Stok Minimum</th>
              <th className="px-5 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {(daftarBarang ?? []).map((b) => {
              const stokMenipis = Number(b.stok_saat_ini) <= Number(b.stok_minimum);
              return (
                <tr key={b.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-5 py-3.5 text-ink">{b.nama_barang}</td>
                  <td className="px-5 py-3.5 text-ink/60">{LABEL_KATEGORI[b.kategori] ?? b.kategori}</td>
                  <td className="px-5 py-3.5">
                    <span className={`font-medium ${stokMenipis ? "text-clay-700" : "text-ink"}`}>
                      {b.stok_saat_ini} {b.satuan}
                    </span>
                    {stokMenipis && (
                      <span className="ml-2 rounded-sm bg-clay-600/10 px-1.5 py-0.5 text-[10px] font-medium text-clay-700">
                        Menipis
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-ink/60">
                    {b.stok_minimum} {b.satuan}
                  </td>
                  <td className="px-5 py-3.5">
                    <FormMutasi barangId={b.id} namaBarang={b.nama_barang} />
                  </td>
                </tr>
              );
            })}
            {(!daftarBarang || daftarBarang.length === 0) && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-sm text-ink/45">
                  Belum ada data barang logistik.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
