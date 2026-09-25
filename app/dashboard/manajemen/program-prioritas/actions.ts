"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

type Hasil = { pesan: string; sukses: boolean };
const PERAN_ISI = ["admin", "kapus", "manajemen"];

export async function simpanProgramPrioritasAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_ISI.includes(pemanggil.peran)) {
    return { pesan: "Cuma admin/kapus/manajemen yang boleh mengisi capaian.", sukses: false };
  }

  const bulan = Number(formData.get("bulan"));
  const tahun = Number(formData.get("tahun"));
  const kodeProgram = String(formData.get("kode_program") ?? "");
  const namaProgram = String(formData.get("nama_program") ?? "");
  const sasaranRaw = String(formData.get("sasaran") ?? "").trim();
  const capaianRaw = String(formData.get("capaian") ?? "").trim();
  const catatan = String(formData.get("catatan") ?? "").trim();

  if (!kodeProgram || !bulan || !tahun) return { pesan: "Data program tidak lengkap.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("program_prioritas_capaian").upsert(
    {
      bulan,
      tahun,
      kode_program: kodeProgram,
      nama_program: namaProgram,
      sasaran: sasaranRaw === "" ? null : Number(sasaranRaw),
      capaian: capaianRaw === "" ? null : Number(capaianRaw),
      catatan: catatan || null,
      diisi_oleh: pemanggil.id,
    },
    { onConflict: "bulan, tahun, kode_program" }
  );

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/program-prioritas");
  return { pesan: "Tersimpan.", sukses: true };
}
