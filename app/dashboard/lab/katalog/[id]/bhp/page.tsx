import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { PERAN_LAB } from "@/lib/lab";
import FormResepBhpLab from "./form-resep-bhp-lab";

export default async function HalamanBhpPemeriksaanLab({ params }: { params: { id: string } }) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus Laboratorium/admin.
      </div>
    );
  }

  const supabase = createClient();
  const [{ data: pemeriksaan }, { data: daftarBhp }, { data: daftarResep, error }] = await Promise.all([
    supabase.from("lab_pemeriksaan").select("id, nama, kode").eq("id", params.id).maybeSingle(),
    supabase.from("bhp").select("id, nama_bhp, satuan, stok_saat_ini").eq("aktif", true).order("nama_bhp"),
    supabase.from("lab_resep_bhp").select("id, jumlah_default, bhp:bhp_id (nama_bhp, satuan)").eq("pemeriksaan_id", params.id),
  ]);

  if (!pemeriksaan) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/lab/katalog"
          className="text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
        >
          ← Kembali ke Katalog
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">Reagen & BHP: {pemeriksaan.nama}</h1>
        <p className="mt-1 text-sm text-ink/60">
          Stok BHP di bawah ini terpotong otomatis tiap kali hasil {pemeriksaan.nama} divalidasi (satu kali per
          pemeriksaan). Pemakaian tercatat di Farmasi &gt; BHP dan di Register & Laporan Lab.
        </p>
      </div>

      {error && (
        <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
          Gagal memuat resep BHP: {error.message}
          {error.message.includes("lab_resep_bhp") && " — jalankan migrasi_tahap_45.sql di Supabase dulu."}
        </div>
      )}

      <FormResepBhpLab
        pemeriksaanId={pemeriksaan.id}
        daftarBhp={(daftarBhp ?? []) as { id: string; nama_bhp: string; satuan: string; stok_saat_ini: number }[]}
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
