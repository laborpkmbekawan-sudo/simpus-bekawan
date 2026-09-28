"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

const PERAN_FARMASI = ["admin", "farmasi"];

export async function tambahBhpAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_FARMASI.includes(pemanggil.peran)) {
    return { pesan: "Cuma farmasi/admin yang boleh tambah BHP." };
  }

  const namaBhp = String(formData.get("nama_bhp") ?? "").trim();
  const satuan = String(formData.get("satuan") ?? "pcs").trim() || "pcs";
  const stokAwal = Number(formData.get("stok_awal") ?? 0);
  const stokMinimum = Number(formData.get("stok_minimum") ?? 0);

  if (!namaBhp) {
    return { pesan: "Nama BHP wajib diisi." };
  }

  const supabase = createClient();
  const { data: bhpBaru, error } = await supabase
    .from("bhp")
    .insert({ nama_bhp: namaBhp, satuan, stok_saat_ini: stokAwal, stok_minimum: stokMinimum })
    .select("id")
    .single();

  if (error || !bhpBaru) {
    return { pesan: `Gagal menyimpan BHP: ${error?.message}` };
  }

  if (stokAwal > 0) {
    await supabase.from("mutasi_stok_bhp").insert({
      bhp_id: bhpBaru.id,
      jenis: "masuk",
      jumlah: stokAwal,
      keterangan: "Stok awal",
      dibuat_oleh: pemanggil.id,
    });
  }

  revalidatePath("/dashboard/farmasi");
  return { pesan: "" };
}

export async function tambahStokMasukAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_FARMASI.includes(pemanggil.peran)) {
    return { pesan: "Cuma farmasi/admin yang boleh catat stok masuk." };
  }

  const bhpId = String(formData.get("bhp_id") ?? "");
  const jumlah = Number(formData.get("jumlah") ?? 0);
  const keterangan = String(formData.get("keterangan") ?? "").trim();

  if (!bhpId || jumlah <= 0) {
    return { pesan: "Pilih BHP dan isi jumlah yang valid." };
  }

  const supabase = createClient();

  const { data: bhpSekarang } = await supabase.from("bhp").select("stok_saat_ini").eq("id", bhpId).single();
  if (!bhpSekarang) {
    return { pesan: "BHP gak ditemukan." };
  }

  const { error } = await supabase
    .from("bhp")
    .update({ stok_saat_ini: Number(bhpSekarang.stok_saat_ini) + jumlah })
    .eq("id", bhpId);

  if (error) {
    return { pesan: `Gagal update stok: ${error.message}` };
  }

  await supabase.from("mutasi_stok_bhp").insert({
    bhp_id: bhpId,
    jenis: "masuk",
    jumlah,
    keterangan: keterangan || "Stok masuk",
    dibuat_oleh: pemanggil.id,
  });

  revalidatePath("/dashboard/farmasi");
  return { pesan: "" };
}
