"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

const PERAN_FARMASI = ["admin", "farmasi"];

export async function terimaStokObatAction(
  _sebelum: { pesan: string; sukses: boolean } | null,
  formData: FormData
): Promise<{ pesan: string; sukses: boolean }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_FARMASI.includes(pemanggil.peran)) {
    return { pesan: "Cuma farmasi/admin yang boleh catat penerimaan stok.", sukses: false };
  }

  const obatId = String(formData.get("obat_id") ?? "");
  const jumlah = Number(formData.get("jumlah") ?? 0);
  const sumber = String(formData.get("sumber") ?? "").trim();
  const noBatch = String(formData.get("no_batch") ?? "").trim();
  const tanggalKadaluwarsa = String(formData.get("tanggal_kadaluwarsa") ?? "").trim();
  const keterangan = String(formData.get("keterangan") ?? "").trim();

  if (!obatId || !(jumlah > 0)) {
    return { pesan: "Pilih obat dan isi jumlah yang valid.", sukses: false };
  }

  const supabase = createClient();

  const { data: obatSekarang } = await supabase.from("obat").select("stok_saat_ini").eq("id", obatId).single();
  if (!obatSekarang) return { pesan: "Obat gak ditemukan.", sukses: false };

  const { error: errUpdate } = await supabase
    .from("obat")
    .update({ stok_saat_ini: Number(obatSekarang.stok_saat_ini) + jumlah })
    .eq("id", obatId);
  if (errUpdate) return { pesan: `Gagal update stok: ${errUpdate.message}`, sukses: false };

  const { error: errMutasi } = await supabase.from("mutasi_stok_obat").insert({
    obat_id: obatId,
    jenis: "masuk",
    jumlah,
    sumber: sumber || null,
    no_batch: noBatch || null,
    tanggal_kadaluwarsa: tanggalKadaluwarsa || null,
    keterangan: keterangan || "Penerimaan stok",
    dibuat_oleh: pemanggil.id,
  });
  if (errMutasi) return { pesan: `Stok kesimpen tapi gagal catat mutasi: ${errMutasi.message}`, sukses: false };

  revalidatePath("/dashboard/farmasi/mutasi");
  revalidatePath("/dashboard/farmasi");
  return { pesan: "Penerimaan stok tercatat.", sukses: true };
}
