import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilKonteksPustu } from "../akses";
import FormIzinPustu, { type OpsiPemeriksaanIzin } from "./form-izin-pustu";

export default async function HalamanIzinPustu() {
  const konteks = await ambilKonteksPustu();
  if (konteks.mode !== "lab" || !konteks.kelola) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        {konteks.mode === "tolak" ? konteks.pesan : "Halaman ini khusus Laboratorium dan admin."}
      </div>
    );
  }

  const supabase = createClient();
  const [{ data: pustu }, { data: pem }, { data: izin, error }] = await Promise.all([
    supabase.from("lokasi").select("id, nama").eq("tipe", "pustu").order("urutan"),
    supabase.from("lab_pemeriksaan").select("id, nama, kategori").eq("aktif", true).order("kategori").order("nama"),
    supabase.from("lab_pustu_izin").select("lokasi_id, pemeriksaan_id"),
  ]);
  if (error) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Gagal memuat: {error.message}
        {error.message.includes("lab_pustu") && " — jalankan migrasi_tahap_50.sql di Supabase dulu."}
      </div>
    );
  }
  const opsi = (pem ?? []) as OpsiPemeriksaanIzin[];

  return (
    <div className="space-y-6">
      <header>
        <Link href="/dashboard/lab/pustu" className="text-sm text-teal-700 hover:underline">
          ← Laporan Pustu Masuk
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold text-ink">Pemeriksaan tiap Pustu</h1>
        <p className="text-sm text-ink/55">Centang pemeriksaan yang boleh dikerjakan dan dilaporkan oleh tiap Pustu.</p>
      </header>
      {(pustu ?? []).map((p) => (
        <FormIzinPustu
          key={p.id}
          lokasiId={p.id as string}
          namaLokasi={p.nama as string}
          opsi={opsi}
          diizinkan={(izin ?? []).filter((i) => i.lokasi_id === p.id).map((i) => i.pemeriksaan_id as string)}
        />
      ))}
    </div>
  );
}
