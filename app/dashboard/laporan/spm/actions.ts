"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

type Hasil = { pesan: string; sukses: boolean };

export async function simpanSpmAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !["admin", "kapus"].includes(pemanggil.peran)) {
    return { pesan: "Khusus admin dan kepala puskesmas.", sukses: false };
  }

  const bulan = Number(formData.get("bulan"));
  const tahun = Number(formData.get("tahun"));
  const kodeIndikator = String(formData.get("kode_indikator") ?? "");
  const namaIndikator = String(formData.get("nama_indikator") ?? "");
  const capaianRaw = String(formData.get("jumlah_capaian") ?? "").trim();
  const targetRaw = String(formData.get("jumlah_target") ?? "").trim();
  const catatan = String(formData.get("catatan") ?? "").trim();

  if (!kodeIndikator || !bulan || !tahun) return { pesan: "Data indikator tidak lengkap.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("spm_capaian").upsert(
    {
      bulan,
      tahun,
      kode_indikator: kodeIndikator,
      nama_indikator: namaIndikator,
      jumlah_capaian: capaianRaw === "" ? null : Number(capaianRaw),
      jumlah_target: targetRaw === "" ? null : Number(targetRaw),
      catatan: catatan || null,
      diisi_oleh: pemanggil.id,
    },
    { onConflict: "bulan, tahun, kode_indikator" }
  );

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/laporan/spm");
  return { pesan: "Tersimpan.", sukses: true };
}
