import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import DaftarResep from "./daftar-resep";

const PERAN_FARMASI = ["admin", "farmasi"];

export default async function HalamanResepObat() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_FARMASI.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus farmasi/admin.
      </div>
    );
  }

  const supabase = createClient();

  const { data: resepMentah } = await supabase
    .from("resep_obat")
    .select(
      `id, status, dicatat_pada,
       kunjungan:kunjungan_id ( pasien:pasien_id ( nama_lengkap, no_rm ) ),
       resep_obat_item ( id, jumlah, aturan_pakai, obat:obat_id ( nama_obat, satuan, stok_saat_ini ) )`
    )
    .in("status", ["menunggu", "diverifikasi"])
    .order("dicatat_pada", { ascending: true });

  type Baris = {
    id: string;
    status: string;
    dicatat_pada: string;
    kunjungan: { pasien: { nama_lengkap: string; no_rm: string } | null } | null;
    resep_obat_item:
      | { id: string; jumlah: number; aturan_pakai: string | null; obat: { nama_obat: string; satuan: string; stok_saat_ini: number } | null }[]
      | null;
  };

  const daftarResep = ((resepMentah ?? []) as unknown as Baris[]).map((r) => ({
    id: r.id,
    status: r.status,
    dicatatPada: r.dicatat_pada,
    namaPasien: r.kunjungan?.pasien?.nama_lengkap ?? "—",
    noRm: r.kunjungan?.pasien?.no_rm ?? "—",
    items: (r.resep_obat_item ?? []).map((i) => ({
      id: i.id,
      namaObat: i.obat?.nama_obat ?? "—",
      satuan: i.obat?.satuan ?? "",
      jumlah: Number(i.jumlah),
      aturanPakai: i.aturan_pakai,
      stokCukup: Number(i.obat?.stok_saat_ini ?? 0) >= Number(i.jumlah),
    })),
  }));

  const menunggu = daftarResep.filter((r) => r.status === "menunggu");
  const siapDiserahkan = daftarResep.filter((r) => r.status === "diverifikasi");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Verifikasi & Penyerahan Resep</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Resep obat dari dokter/perawat/bidan pas pelayanan pasien. Verifikasi dulu, baru serahkan (stok kepotong
          otomatis pas diserahkan).
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-extrabold text-ink">Menunggu Verifikasi ({menunggu.length})</h2>
        <DaftarResep daftarResep={menunggu} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-extrabold text-ink">Siap Diserahkan ({siapDiserahkan.length})</h2>
        <DaftarResep daftarResep={siapDiserahkan} />
      </div>
    </div>
  );
}
