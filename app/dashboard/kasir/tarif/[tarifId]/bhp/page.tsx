import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormResepBhp from "./form-resep-bhp";

export default async function HalamanAturBhp({
  params,
}: {
  params: { tarifId: string };
}) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !["admin", "farmasi"].includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin/farmasi.
      </div>
    );
  }

  const supabase = createClient();
  const [{ data: tarif }, { data: daftarBhp }, { data: daftarResep }] = await Promise.all([
    supabase.from("tarif_layanan").select("id, nama_layanan").eq("id", params.tarifId).single(),
    supabase.from("bhp").select("id, nama_bhp, satuan").eq("aktif", true).order("nama_bhp"),
    supabase
      .from("resep_bhp_tindakan")
      .select("id, jumlah_default, bhp:bhp_id (nama_bhp, satuan)")
      .eq("tarif_layanan_id", params.tarifId),
  ]);

  if (!tarif) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/kasir/tarif"
          className="text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
        >
          ← Kembali ke Tarif & Tindakan
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">Atur BHP: {tarif.nama_layanan}</h1>
        <p className="mt-1 text-sm text-ink/60">
          BHP di sini bakal muncul otomatis (bisa diedit) pas tindakan ini dicentang di rekam medis.
        </p>
      </div>

      <FormResepBhp
        tarifLayananId={tarif.id}
        daftarBhp={daftarBhp ?? []}
        daftarResep={
          (daftarResep ?? []).map((r) => ({
            ...r,
            bhp: r.bhp as unknown as { nama_bhp: string; satuan: string } | null,
          })) as { id: string; jumlah_default: number; bhp: { nama_bhp: string; satuan: string } | null }[]
        }
      />
    </div>
  );
}
