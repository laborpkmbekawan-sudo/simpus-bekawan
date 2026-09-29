"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

const PERAN_FARMASI = ["admin", "farmasi"];

type BarisMentah = { obat_id: string; stok_sistem: string; stok_fisik: string };

export async function simpanStokOpnameAction(
  _sebelum: { pesan: string; sukses: boolean } | null,
  formData: FormData
): Promise<{ pesan: string; sukses: boolean }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_FARMASI.includes(pemanggil.peran)) {
    return { pesan: "Cuma farmasi/admin yang boleh catat stok opname.", sukses: false };
  }

  const catatan = String(formData.get("catatan") ?? "").trim();
  const itemsMentah = String(formData.get("items") ?? "[]");

  let baris: BarisMentah[] = [];
  try {
    baris = JSON.parse(itemsMentah);
  } catch {
    return { pesan: "Data stok opname gak kebaca, coba lagi.", sukses: false };
  }

  // Cuma baris yang stok fisiknya beneran diisi yang diproses -- obat yang
  // gak disentuh (kosongin field) dianggap gak ikut opname sesi ini.
  const itemValid = baris.filter((b) => b.stok_fisik !== "" && b.stok_fisik !== null && b.stok_fisik !== undefined);
  if (itemValid.length === 0) {
    return { pesan: "Isi minimal satu stok fisik obat.", sukses: false };
  }

  const supabase = createClient();

  const { data: opnameBaru, error } = await supabase
    .from("stok_opname")
    .insert({ catatan: catatan || null, dibuat_oleh: pemanggil.id })
    .select("id")
    .single();

  if (error || !opnameBaru) {
    return { pesan: `Gagal simpan sesi opname: ${error?.message}`, sukses: false };
  }

  const barisInsert = itemValid.map((b) => ({
    stok_opname_id: opnameBaru.id,
    obat_id: b.obat_id,
    stok_sistem: Number(b.stok_sistem),
    stok_fisik: Number(b.stok_fisik),
    selisih: Number(b.stok_fisik) - Number(b.stok_sistem),
  }));

  const { error: errorItem } = await supabase.from("stok_opname_item").insert(barisInsert);
  if (errorItem) {
    return { pesan: `Sesi opname tersimpan tapi baris gagal: ${errorItem.message}`, sukses: false };
  }

  // Obat yang selisih != 0 langsung disamain ke stok fisik + tercatat di
  // kartu stok sebagai "penyesuaian" (bisa plus/minus).
  for (const b of barisInsert) {
    if (b.selisih === 0) continue;
    await supabase.from("obat").update({ stok_saat_ini: b.stok_fisik }).eq("id", b.obat_id);
    await supabase.from("mutasi_stok_obat").insert({
      obat_id: b.obat_id,
      jenis: "penyesuaian",
      jumlah: b.selisih,
      keterangan: `Stok opname${catatan ? ": " + catatan : ""}`,
      dibuat_oleh: pemanggil.id,
    });
  }

  revalidatePath("/dashboard/farmasi/stok-opname");
  revalidatePath("/dashboard/farmasi/obat");
  revalidatePath("/dashboard/farmasi/kartu-stok");
  return { pesan: "Stok opname tersimpan, selisih udah otomatis nyesuain stok.", sukses: true };
}
