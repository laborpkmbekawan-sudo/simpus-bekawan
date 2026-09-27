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

export async function tambahObatAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_FARMASI.includes(pemanggil.peran)) {
    return { pesan: "Cuma farmasi/admin yang boleh tambah obat." };
  }

  const namaObat = String(formData.get("nama_obat") ?? "").trim();
  const kategori = String(formData.get("kategori") ?? "Lain-lain").trim() || "Lain-lain";
  const bentukSediaan = String(formData.get("bentuk_sediaan") ?? "Tablet").trim() || "Tablet";
  const satuan = String(formData.get("satuan") ?? "Tablet").trim() || "Tablet";
  const stokAwal = Number(formData.get("stok_awal") ?? 0);
  const stokMinimum = Number(formData.get("stok_minimum") ?? 0);

  if (!namaObat) {
    return { pesan: "Nama obat wajib diisi." };
  }

  const supabase = createClient();
  const { data: obatBaru, error } = await supabase
    .from("obat")
    .insert({
      nama_obat: namaObat,
      kategori,
      bentuk_sediaan: bentukSediaan,
      satuan,
      stok_saat_ini: stokAwal,
      stok_minimum: stokMinimum,
    })
    .select("id")
    .single();

  if (error || !obatBaru) {
    return { pesan: `Gagal menyimpan obat: ${error?.message}` };
  }

  if (stokAwal > 0) {
    await supabase.from("mutasi_stok_obat").insert({
      obat_id: obatBaru.id,
      jenis: "masuk",
      jumlah: stokAwal,
      keterangan: "Stok awal",
      dibuat_oleh: pemanggil.id,
    });
  }

  revalidatePath("/dashboard/farmasi");
  return { pesan: "" };
}

export async function tambahStokMasukObatAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_FARMASI.includes(pemanggil.peran)) {
    return { pesan: "Cuma farmasi/admin yang boleh catat stok masuk." };
  }

  const obatId = String(formData.get("obat_id") ?? "");
  const jumlah = Number(formData.get("jumlah") ?? 0);
  const keterangan = String(formData.get("keterangan") ?? "").trim();

  if (!obatId || jumlah <= 0) {
    return { pesan: "Pilih obat dan isi jumlah yang valid." };
  }

  const supabase = createClient();

  const { data: obatSekarang } = await supabase
    .from("obat")
    .select("stok_saat_ini")
    .eq("id", obatId)
    .single();
  if (!obatSekarang) {
    return { pesan: "Obat gak ditemukan." };
  }

  const { error } = await supabase
    .from("obat")
    .update({ stok_saat_ini: Number(obatSekarang.stok_saat_ini) + jumlah })
    .eq("id", obatId);

  if (error) {
    return { pesan: `Gagal update stok: ${error.message}` };
  }

  await supabase.from("mutasi_stok_obat").insert({
    obat_id: obatId,
    jenis: "masuk",
    jumlah,
    keterangan: keterangan || "Stok masuk",
    dibuat_oleh: pemanggil.id,
  });

  revalidatePath("/dashboard/farmasi");
  return { pesan: "" };
}
