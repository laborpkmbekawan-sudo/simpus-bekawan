import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormTambahBhp from "./form-tambah-bhp";
import FormStokMasuk from "./form-stok-masuk";
import FormTambahObat from "./form-tambah-obat";
import FormStokMasukObat from "./form-stok-masuk-obat";

export default async function HalamanFarmasi() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !["admin", "farmasi"].includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus farmasi/admin.
      </div>
    );
  }

  const supabase = createClient();
  const { data: daftarBhp } = await supabase
    .from("bhp")
    .select("id, nama_bhp, satuan, stok_saat_ini, stok_minimum, aktif")
    .order("nama_bhp", { ascending: true });

  const { data: daftarObat } = await supabase
    .from("obat")
    .select("id, nama_obat, kategori, bentuk_sediaan, satuan, stok_saat_ini, stok_minimum, aktif")
    .order("nama_obat", { ascending: true });

  const menipis = (daftarBhp ?? []).filter((b) => Number(b.stok_saat_ini) <= Number(b.stok_minimum));
  const obatMenipis = (daftarObat ?? []).filter((o) => Number(o.stok_saat_ini) <= Number(o.stok_minimum));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Farmasi</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Kelola stok obat dan bahan habis pakai (BHP). Stok BHP kepotong otomatis pas tindakan dicatat di rekam
          medis.
        </p>
      </div>

      {obatMenipis.length > 0 && (
        <div className="rounded-card border border-clay-600/30 bg-clay-600/10 p-4">
          <p className="text-sm font-bold text-clay-700">⚠ {obatMenipis.length} obat stoknya menipis</p>
          <p className="mt-1 text-xs text-clay-700">
            {obatMenipis.map((o) => o.nama_obat).join(", ")}
          </p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-extrabold text-ink">Data Obat</h2>
        <p className="mt-1 text-sm text-ink/60">Master data obat, kategori, dan bentuk sediaan.</p>
      </div>

      <FormTambahObat />

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-5 py-3 font-medium">Nama Obat</th>
              <th className="px-5 py-3 font-medium">Kategori</th>
              <th className="px-5 py-3 font-medium">Bentuk Sediaan</th>
              <th className="px-5 py-3 font-medium">Stok Saat Ini</th>
              <th className="px-5 py-3 font-medium">Stok Minimum</th>
              <th className="px-5 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {(daftarObat ?? []).map((o) => {
              const stokMenipis = Number(o.stok_saat_ini) <= Number(o.stok_minimum);
              return (
                <tr key={o.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-5 py-3.5 text-ink">{o.nama_obat}</td>
                  <td className="px-5 py-3.5 text-ink/60">{o.kategori}</td>
                  <td className="px-5 py-3.5 text-ink/60">{o.bentuk_sediaan}</td>
                  <td className="px-5 py-3.5">
                    <span className={`font-medium ${stokMenipis ? "text-clay-700" : "text-ink"}`}>
                      {o.stok_saat_ini} {o.satuan}
                    </span>
                    {stokMenipis && (
                      <span className="ml-2 rounded-sm bg-clay-600/10 px-1.5 py-0.5 text-[10px] font-medium text-clay-700">
                        Menipis
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-ink/60">
                    {o.stok_minimum} {o.satuan}
                  </td>
                  <td className="px-5 py-3.5">
                    <FormStokMasukObat obatId={o.id} namaObat={o.nama_obat} />
                  </td>
                </tr>
              );
            })}
            {(!daftarObat || daftarObat.length === 0) && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-sm text-ink/45">
                  Belum ada data obat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-lg font-extrabold text-ink">Data BHP</h2>
        <p className="mt-1 text-sm text-ink/60">Bahan habis pakai untuk tindakan.</p>
      </div>

      {menipis.length > 0 && (
        <div className="rounded-card border border-clay-600/30 bg-clay-600/10 p-4">
          <p className="text-sm font-bold text-clay-700">⚠ {menipis.length} BHP stoknya menipis</p>
          <p className="mt-1 text-xs text-clay-700">
            {menipis.map((b) => b.nama_bhp).join(", ")}
          </p>
        </div>
      )}

      <FormTambahBhp />

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-5 py-3 font-medium">Nama BHP</th>
              <th className="px-5 py-3 font-medium">Stok Saat Ini</th>
              <th className="px-5 py-3 font-medium">Stok Minimum</th>
              <th className="px-5 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {(daftarBhp ?? []).map((b) => {
              const stokMenipis = Number(b.stok_saat_ini) <= Number(b.stok_minimum);
              return (
                <tr key={b.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-5 py-3.5 text-ink">{b.nama_bhp}</td>
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
                    <FormStokMasuk bhpId={b.id} namaBhp={b.nama_bhp} />
                  </td>
                </tr>
              );
            })}
            {(!daftarBhp || daftarBhp.length === 0) && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-sm text-ink/45">
                  Belum ada data BHP.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
