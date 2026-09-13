import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FormKunjungan from "./form-kunjungan";

export default async function HalamanDaftarKunjungan({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: pasien }, { data: daftarKlaster }] = await Promise.all([
    supabase
      .from("pasien")
      .select("id, no_rm, nama_lengkap, tanggal_lahir, jenis_kelamin")
      .eq("id", params.id)
      .single(),
    supabase
      .from("klaster")
      .select("id, nama")
      .not("kode_antrian", "is", null)
      .order("urutan", { ascending: true }),
  ]);

  if (!pasien) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/pasien"
          className="text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
        >
          ← Kembali ke Data Pasien
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">Daftar Kunjungan</h1>
      </div>

      <div className="rounded-card border border-sand-100 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-ink/40">Pasien</p>
        <p className="mt-1 text-lg font-bold text-ink">{pasien.nama_lengkap}</p>
        <p className="text-sm text-ink/60">
          No. RM {pasien.no_rm}
          {pasien.jenis_kelamin ? ` · ${pasien.jenis_kelamin}` : ""}
        </p>
      </div>

      <FormKunjungan pasienId={pasien.id} daftarKlaster={daftarKlaster ?? []} />
    </div>
  );
}
