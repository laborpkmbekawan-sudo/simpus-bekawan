import { createClient } from "@/lib/supabase/server";
import TabelCariRm from "./tabel-cari-rm";

export default async function HalamanRekamMedisUtama() {
  const supabase = createClient();
  const { data: daftarPasien } = await supabase
    .from("pasien")
    .select("id, no_rm, nik, nama_lengkap")
    .order("nama_lengkap", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Rekam Medis</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Cari pasien buat buka riwayat rekam medisnya.
        </p>
      </div>

      <TabelCariRm daftarPasien={daftarPasien ?? []} />
    </div>
  );
}
