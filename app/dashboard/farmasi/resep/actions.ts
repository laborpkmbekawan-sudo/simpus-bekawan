"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

// Farmasi boleh entri manual (sementara, sebelum dokter bisa nulis resep
// langsung dari halaman Pelayanan) -- peran klinis juga diizinin di RLS
// buat jaga-jaga integrasi nanti, tapi form entri manual sekarang cuma
// dipasang di menu Farmasi.
const PERAN_BOLEH_CATAT = ["admin", "dokter", "dokter_gigi", "perawat", "bidan", "farmasi"];
const PERAN_FARMASI = ["admin", "farmasi"];

type BarisItemMentah = {
  obat_id: string;
  dosis: string;
  frekuensi_per_hari: string;
  waktu_pemberian: string;
  durasi_hari: string;
  jumlah: string;
  catatan: string;
};

export async function buatResepManualAction(
  _sebelum: { pesan: string; sukses: boolean } | null,
  formData: FormData
): Promise<{ pesan: string; sukses: boolean }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_BOLEH_CATAT.includes(pemanggil.peran)) {
    return { pesan: "Akunmu gak boleh bikin resep.", sukses: false };
  }

  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const catatan = String(formData.get("catatan") ?? "").trim();
  const itemsMentah = String(formData.get("items") ?? "[]");

  if (!kunjunganId) {
    return { pesan: "Pilih kunjungan/pasien dulu.", sukses: false };
  }

  let baris: BarisItemMentah[] = [];
  try {
    baris = JSON.parse(itemsMentah);
  } catch {
    return { pesan: "Data obat gak kebaca, coba lagi.", sukses: false };
  }

  const itemValid = baris.filter((b) => b.obat_id && Number(b.jumlah) > 0);
  if (itemValid.length === 0) {
    return { pesan: "Tambah minimal satu obat dengan jumlah yang valid.", sukses: false };
  }

  const supabase = createClient();

  const { data: resepBaru, error } = await supabase
    .from("resep_obat")
    .insert({
      kunjungan_id: kunjunganId,
      catatan: catatan || null,
      dibuat_oleh: pemanggil.id,
    })
    .select("id")
    .single();

  if (error || !resepBaru) {
    return { pesan: `Gagal simpan resep: ${error?.message}`, sukses: false };
  }

  const barisInsert = itemValid.map((b) => ({
    resep_obat_id: resepBaru.id,
    obat_id: b.obat_id,
    dosis: b.dosis || null,
    frekuensi_per_hari: b.frekuensi_per_hari ? Math.round(Number(b.frekuensi_per_hari)) : null,
    waktu_pemberian: b.waktu_pemberian || null,
    durasi_hari: b.durasi_hari ? Math.round(Number(b.durasi_hari)) : null,
    jumlah: Number(b.jumlah),
    catatan: b.catatan || null,
  }));

  const { error: errorItem } = await supabase.from("resep_obat_item").insert(barisInsert);
  if (errorItem) {
    return { pesan: `Resep tersimpan tapi baris obat gagal: ${errorItem.message}`, sukses: false };
  }

  revalidatePath("/dashboard/farmasi/resep");
  revalidatePath("/dashboard/farmasi/resep/entri");
  return { pesan: "Resep berhasil disimpan, masuk ke antrian Verifikasi & Penyerahan.", sukses: true };
}

export async function verifikasiSerahResepAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_FARMASI.includes(pemanggil.peran)) {
    return { pesan: "Cuma farmasi/admin yang boleh verifikasi & serahkan resep." };
  }

  const resepId = String(formData.get("resep_id") ?? "");
  if (!resepId) {
    return { pesan: "Resep gak ditemukan." };
  }

  const supabase = createClient();

  const { data: items } = await supabase
    .from("resep_obat_item")
    .select("id, obat_id, jumlah, dibatalkan, obat:obat_id (nama_obat, stok_saat_ini)")
    .eq("resep_obat_id", resepId)
    .eq("dibatalkan", false);

  const daftarItem = (items ?? []) as unknown as {
    id: string;
    obat_id: string;
    jumlah: number;
    obat: { nama_obat: string; stok_saat_ini: number } | null;
  }[];

  if (daftarItem.length === 0) {
    return { pesan: "Gak ada baris obat aktif di resep ini." };
  }

  // Cek stok semua baris dulu sebelum motong apa pun -- biar gak ada yang
  // kepotong sebagian doang kalau di tengah jalan ternyata stok kurang.
  const kurang = daftarItem.filter((it) => !it.obat || Number(it.obat.stok_saat_ini) < Number(it.jumlah));
  if (kurang.length > 0) {
    const nama = kurang.map((it) => it.obat?.nama_obat ?? "obat").join(", ");
    return { pesan: `Stok gak cukup buat: ${nama}. Batalkan baris itu atau isi stok dulu.` };
  }

  for (const it of daftarItem) {
    const stokBaru = Number(it.obat!.stok_saat_ini) - Number(it.jumlah);
    const { error: errorUpdate } = await supabase.from("obat").update({ stok_saat_ini: stokBaru }).eq("id", it.obat_id);
    if (errorUpdate) {
      return { pesan: `Gagal potong stok ${it.obat?.nama_obat}: ${errorUpdate.message}` };
    }
    await supabase.from("mutasi_stok_obat").insert({
      obat_id: it.obat_id,
      jenis: "keluar",
      jumlah: it.jumlah,
      keterangan: `Penyerahan resep ${resepId}`,
      dibuat_oleh: pemanggil.id,
    });
  }

  const { error: errorResep } = await supabase
    .from("resep_obat")
    .update({ status: "selesai", diserahkan_oleh: pemanggil.id, diserahkan_pada: new Date().toISOString() })
    .eq("id", resepId);

  if (errorResep) {
    return { pesan: `Stok udah kepotong tapi status resep gagal diupdate: ${errorResep.message}` };
  }

  revalidatePath("/dashboard/farmasi/resep");
  revalidatePath("/dashboard/farmasi/obat");
  return { pesan: "" };
}

export async function batalkanResepAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_FARMASI.includes(pemanggil.peran)) {
    return { pesan: "Cuma farmasi/admin yang boleh batalin resep." };
  }

  const resepId = String(formData.get("resep_id") ?? "");
  if (!resepId) {
    return { pesan: "Resep gak ditemukan." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("resep_obat").update({ status: "dibatalkan" }).eq("id", resepId);
  if (error) {
    return { pesan: `Gagal batalin resep: ${error.message}` };
  }

  revalidatePath("/dashboard/farmasi/resep");
  return { pesan: "" };
}
