"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

const PERAN_LOGISTIK = ["admin", "kapus", "manajemen"];

export async function tambahBarangAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LOGISTIK.includes(pemanggil.peran)) {
    return { pesan: "Cuma admin/kapus/manajemen yang boleh tambah barang." };
  }

  const namaBarang = String(formData.get("nama_barang") ?? "").trim();
  const kategori = String(formData.get("kategori") ?? "lainnya");
  const satuan = String(formData.get("satuan") ?? "pcs").trim() || "pcs";
  const stokAwal = Number(formData.get("stok_awal") ?? 0);
  const stokMinimum = Number(formData.get("stok_minimum") ?? 0);

  if (!namaBarang) return { pesan: "Nama barang wajib diisi." };

  const supabase = createClient();
  const { data: barangBaru, error } = await supabase
    .from("logistik_barang")
    .insert({
      nama_barang: namaBarang,
      kategori,
      satuan,
      stok_saat_ini: stokAwal,
      stok_minimum: stokMinimum,
    })
    .select("id")
    .single();

  if (error || !barangBaru) return { pesan: `Gagal menyimpan barang: ${error?.message}` };

  if (stokAwal > 0) {
    await supabase.from("logistik_mutasi").insert({
      barang_id: barangBaru.id,
      jenis: "masuk",
      jumlah: stokAwal,
      keterangan: "Stok awal",
      dibuat_oleh: pemanggil.id,
    });
  }

  revalidatePath("/dashboard/manajemen/logistik");
  return { pesan: "" };
}

export async function catatMutasiAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LOGISTIK.includes(pemanggil.peran)) {
    return { pesan: "Cuma admin/kapus/manajemen yang boleh catat mutasi." };
  }

  const barangId = String(formData.get("barang_id") ?? "");
  const jenis = String(formData.get("jenis") ?? "masuk");
  const jumlah = Number(formData.get("jumlah") ?? 0);
  const keterangan = String(formData.get("keterangan") ?? "").trim();

  if (!barangId || jumlah <= 0) return { pesan: "Pilih barang dan isi jumlah yang valid." };

  const supabase = createClient();
  const { data: barangSekarang } = await supabase
    .from("logistik_barang")
    .select("stok_saat_ini")
    .eq("id", barangId)
    .single();
  if (!barangSekarang) return { pesan: "Barang gak ditemukan." };

  const stokBaru =
    jenis === "keluar"
      ? Number(barangSekarang.stok_saat_ini) - jumlah
      : jenis === "penyesuaian"
        ? jumlah
        : Number(barangSekarang.stok_saat_ini) + jumlah;

  const { error } = await supabase.from("logistik_barang").update({ stok_saat_ini: stokBaru }).eq("id", barangId);
  if (error) return { pesan: `Gagal update stok: ${error.message}` };

  await supabase.from("logistik_mutasi").insert({
    barang_id: barangId,
    jenis,
    jumlah,
    keterangan: keterangan || null,
    dibuat_oleh: pemanggil.id,
  });

  revalidatePath("/dashboard/manajemen/logistik");
  return { pesan: "" };
}
