"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

type Hasil = { pesan: string; sukses: boolean };
const PERAN_AJUKAN = ["admin", "kapus", "bendahara_bok", "manajemen"];
const PERAN_SETUJUI = ["admin", "kapus", "bendahara_bok"];

function teksAtauNull(formData: FormData, nama: string): string | null {
  const nilai = String(formData.get(nama) ?? "").trim();
  return nilai || null;
}

export async function ajukanPengeluaranAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_AJUKAN.includes(pemanggil.peran)) {
    return { pesan: "Cuma admin/kapus/bendahara BOK/manajemen yang boleh mengajukan.", sukses: false };
  }

  const kategori = String(formData.get("kategori") ?? "").trim();
  const jumlah = Number(formData.get("jumlah") ?? 0);
  if (!kategori || !jumlah || jumlah <= 0) return { pesan: "Isi kategori dan jumlah yang valid.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("pengeluaran_internal").insert({
    tanggal: teksAtauNull(formData, "tanggal") ?? new Date().toISOString().slice(0, 10),
    kategori,
    jumlah,
    keterangan: teksAtauNull(formData, "keterangan"),
    diajukan_oleh: pemanggil.id,
  });

  if (error) return { pesan: `Gagal mengajukan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/manajemen/keuangan");
  return { pesan: "Pengajuan tersimpan, menunggu persetujuan.", sukses: true };
}

export async function putuskanPengeluaranAction(id: string, disetujui: boolean) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_SETUJUI.includes(pemanggil.peran)) return;

  const supabase = createClient();
  await supabase
    .from("pengeluaran_internal")
    .update({
      status: disetujui ? "disetujui" : "ditolak",
      disetujui_oleh: pemanggil.id,
    })
    .eq("id", id);

  revalidatePath("/dashboard/manajemen/keuangan");
}
