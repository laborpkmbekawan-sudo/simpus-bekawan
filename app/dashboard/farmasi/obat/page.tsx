import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import FormTambahObat from "./form-tambah-obat";
import FormStokMasukObat from "./form-stok-masuk-obat";

export default async function HalamanMasterObat() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !["admin", "farmasi"].includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus farmasi/admin.
      </div>
    );
  }
  const kodeAkses = await getKodeAksesSaya(pemanggil.id, pemanggil.peran);
  if (!punyaAkses(kodeAkses, "lintas_farmasi")) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Akunmu belum dikasih akses ke Farmasi. Minta admin nambahin akses klaster
        &quot;Lintas Klaster - Farmasi&quot; di halaman Data Pegawai.
      </div>
    );
  }

  const supabase = createClient();
  const { data: daftarObat } = await supabase
    .from("obat")
    .select("id, nama_obat, kategori, bentuk_sediaan, satuan, stok_saat_ini, stok_minimum, aktif")
    .order("nama_obat", { ascending: true });

  const menipis = (daftarObat ?? []).filter((o) => Number(o.stok_saat_ini) <= Number(o.stok_minimum));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Master Data Obat</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Kelola daftar obat dan stok berjalan. Catat penerimaan lewat &quot;+ Penerimaan stok&quot; per baris; stok
          kepotong otomatis pas resep diverifikasi &amp; diserahkan.
        </p>
      </div>

      {menipis.length > 0 && (
        <div className="rounded-card border border-clay-600/30 bg-clay-600/10 p-4">
          <p className="text-sm font-bold text-clay-700">⚠ {menipis.length} obat stoknya menipis</p>
          <p className="mt-1 text-xs text-clay-700">{menipis.map((o) => o.nama_obat).join(", ")}</p>
        </div>
      )}

      <FormTambahObat />

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-5 py-3 font-medium">Nama Obat</th>
              <th className="px-5 py-3 font-medium">Kategori</th>
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
                  <td className="px-5 py-3.5 text-ink">
                    {o.nama_obat}
                    {o.bentuk_sediaan && <span className="ml-1.5 text-xs text-ink/40">({o.bentuk_sediaan})</span>}
                  </td>
                  <td className="px-5 py-3.5 text-ink/60">{o.kategori ?? "—"}</td>
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
                <td colSpan={5} className="px-5 py-6 text-center text-sm text-ink/45">
                  Belum ada data obat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
