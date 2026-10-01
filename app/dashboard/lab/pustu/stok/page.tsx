import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hariIniWib, tanggalPanjang } from "@/lib/format";
import { namaBulan } from "@/lib/lab";
import { ambilKonteksPustu } from "../akses";
import FormStokPustu from "./form-stok-pustu";

type Stok = {
  id: string;
  periode: string;
  nama_barang: string;
  jenis: string;
  satuan: string;
  stok_awal: number;
  masuk: number;
  dipakai: number;
  stok_akhir: number;
  stok_minimum: number;
  tanggal_kadaluarsa: string | null;
  catatan: string | null;
};

export default async function HalamanStokPustu() {
  const konteks = await ambilKonteksPustu();
  if (konteks.mode !== "pustu") {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        {konteks.mode === "tolak" ? konteks.pesan : "Input stok Pustu hanya untuk petugas yang berlokasi di Pustu."}
      </div>
    );
  }

  const hariIni = hariIniWib();
  const bulanIni = hariIni.slice(0, 7);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lab_pustu_stok")
    .select("id, periode, nama_barang, jenis, satuan, stok_awal, masuk, dipakai, stok_akhir, stok_minimum, tanggal_kadaluarsa, catatan")
    .eq("lokasi_id", konteks.lokasiId)
    .order("periode", { ascending: false })
    .order("nama_barang")
    .range(0, 499);
  if (error) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Gagal memuat stok: {error.message}
        {error.message.includes("lab_pustu") && " — jalankan migrasi_tahap_50.sql di Supabase dulu."}
      </div>
    );
  }
  const stok = (data ?? []) as unknown as Stok[];
  const perBulan = new Map<string, Stok[]>();
  for (const s of stok) perBulan.set(s.periode, [...(perBulan.get(s.periode) ?? []), s]);

  return (
    <div className="space-y-6">
      <header>
        <Link href="/dashboard/lab/pustu" className="text-sm text-teal-700 hover:underline">
          ← Lab Pustu
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold text-ink">Stok BHP &amp; reagen</h1>
        <p className="text-sm text-ink/55">{konteks.namaLokasi} · laporan bulanan ke Lab Induk</p>
      </header>

      <FormStokPustu bulanIni={bulanIni} />

      {Array.from(perBulan.entries()).map(([periode, baris]) => (
        <section key={periode} className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="mb-3 text-base font-bold text-ink">{namaBulan(periode)}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-ink/40">
                  <th className="py-1.5 pr-4">Barang</th>
                  <th className="py-1.5 pr-4">Awal</th>
                  <th className="py-1.5 pr-4">Masuk</th>
                  <th className="py-1.5 pr-4">Dipakai</th>
                  <th className="py-1.5 pr-4">Sisa</th>
                  <th className="py-1.5">Kadaluarsa</th>
                </tr>
              </thead>
              <tbody>
                {baris.map((s) => {
                  const menipis = Number(s.stok_akhir) <= Number(s.stok_minimum);
                  const lewat = !!s.tanggal_kadaluarsa && s.tanggal_kadaluarsa <= hariIni;
                  return (
                    <tr key={s.id} className="border-t border-sand-100">
                      <td className="py-1.5 pr-4 font-medium text-ink">
                        {s.nama_barang} <span className="text-xs text-ink/40">{s.jenis === "reagen" ? "reagen" : "BHP"}</span>
                      </td>
                      <td className="py-1.5 pr-4">{Number(s.stok_awal)}</td>
                      <td className="py-1.5 pr-4">{Number(s.masuk)}</td>
                      <td className="py-1.5 pr-4">{Number(s.dipakai)}</td>
                      <td className={`py-1.5 pr-4 font-bold ${menipis ? "text-clay-700" : "text-ink"}`}>
                        {Number(s.stok_akhir)} {s.satuan}
                        {menipis && Number(s.stok_minimum) > 0 ? " · menipis" : ""}
                      </td>
                      <td className={`py-1.5 ${lewat ? "font-bold text-red-600" : "text-ink/60"}`}>
                        {s.tanggal_kadaluarsa ? tanggalPanjang(s.tanggal_kadaluarsa) : "—"}
                        {lewat ? " · kadaluarsa" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
