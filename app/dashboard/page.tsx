import { getPegawaiSaya } from "@/lib/supabase/server";

export default async function BerandaDashboard() {
  const pegawai = await getPegawaiSaya();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">
        Selamat datang, {pegawai?.nama_lengkap}
      </h1>
      <p className="mt-1.5 text-sm text-ink/60">
        Modul pendaftaran, rekam medis, dan apotek menyusul di tahap
        berikutnya.
      </p>
    </div>
  );
}
