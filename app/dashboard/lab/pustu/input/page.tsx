import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hariIniWib } from "@/lib/format";
import type { ParameterLab } from "@/lib/lab";
import { ambilKonteksPustu } from "../akses";
import FormInputHasilPustu, { type PemeriksaanPustu } from "./form-input-hasil";

export default async function HalamanInputHasilPustu() {
  const konteks = await ambilKonteksPustu();
  if (konteks.mode !== "pustu") {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        {konteks.mode === "tolak" ? konteks.pesan : "Input hasil dari Pustu hanya untuk petugas yang berlokasi di Pustu."}
      </div>
    );
  }

  const supabase = createClient();
  const { data: izin, error } = await supabase
    .from("lab_pustu_izin")
    .select("pemeriksaan_id")
    .eq("lokasi_id", konteks.lokasiId);
  if (error) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Gagal memuat: {error.message}
        {error.message.includes("lab_pustu") && " — jalankan migrasi_tahap_50.sql di Supabase dulu."}
      </div>
    );
  }
  const ids = (izin ?? []).map((i) => i.pemeriksaan_id as string);

  let daftar: PemeriksaanPustu[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("lab_pemeriksaan")
      .select(
        "id, nama, kategori, parameter:lab_parameter (id, nama, satuan, tipe, pilihan, pilihan_normal, min_l, max_l, min_p, max_p, urutan, aktif)",
      )
      .in("id", ids)
      .eq("aktif", true)
      .order("nama");
    daftar = ((data ?? []) as unknown as (Omit<PemeriksaanPustu, "parameter"> & { parameter: ParameterLab[] })[]).map((d) => ({
      id: d.id,
      nama: d.nama,
      kategori: d.kategori,
      parameter: (d.parameter ?? []).filter((p) => p.aktif).sort((a, b) => a.urutan - b.urutan),
    }));
  }

  return (
    <div className="space-y-6">
      <header>
        <Link href="/dashboard/lab/pustu" className="text-sm text-teal-700 hover:underline">
          ← Lab Pustu
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold text-ink">Input hasil pemeriksaan</h1>
        <p className="text-sm text-ink/55">{konteks.namaLokasi} · hasil dikirim ke Lab Induk untuk diverifikasi</p>
      </header>
      {daftar.length === 0 ? (
        <div className="rounded-card border border-sand-100 bg-white px-5 py-10 text-center text-sm text-ink/55">
          Belum ada pemeriksaan yang diizinkan untuk {konteks.namaLokasi}. Minta Lab Induk mengaturnya di menu Lab Pustu &gt; Atur pemeriksaan.
        </div>
      ) : (
        <FormInputHasilPustu daftar={daftar} hariIni={hariIniWib()} />
      )}
    </div>
  );
}
