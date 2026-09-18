"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

const PERAN_KASIR = ["admin", "loket_rm_kasir"];

export async function bukaShiftAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KASIR.includes(pemanggil.peran)) {
    return { pesan: "Cuma kasir/admin yang boleh buka shift." };
  }

  const modalAwal = Number(formData.get("modal_awal") ?? 0);
  const supabase = createClient();

  const { error } = await supabase.from("shift_kasir").insert({
    pegawai_id: pemanggil.id,
    modal_awal: modalAwal,
    status: "buka",
  });

  if (error) {
    return { pesan: `Gagal buka shift: ${error.message}` };
  }

  revalidatePath("/dashboard/kasir");
  return { pesan: "" };
}

export async function tutupShiftAction(formData: FormData) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return;

  const shiftId = String(formData.get("shift_id") ?? "");
  const kasAkhir = Number(formData.get("kas_akhir") ?? 0);

  const supabase = createClient();
  await supabase
    .from("shift_kasir")
    .update({ kas_akhir: kasAkhir, status: "tutup", ditutup_pada: new Date().toISOString() })
    .eq("id", shiftId)
    .eq("pegawai_id", pemanggil.id);

  revalidatePath("/dashboard/kasir");
}

export async function buatTagihanTunaiAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KASIR.includes(pemanggil.peran)) {
    return { pesan: "Cuma kasir/admin yang boleh proses pembayaran." };
  }

  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const shiftId = String(formData.get("shift_id") ?? "");
  const jenisPenjamin = String(formData.get("jenis_penjamin") ?? "umum");
  const itemMentah = String(formData.get("item_tagihan") ?? "[]");

  let daftarItem: { nama: string; harga: number; qty: number }[] = [];
  try {
    daftarItem = JSON.parse(itemMentah);
  } catch {
    return { pesan: "Data layanan tidak valid." };
  }

  if (daftarItem.length === 0) {
    return { pesan: "Pilih minimal satu layanan dulu." };
  }

  const supabase = createClient();
  const total = daftarItem.reduce((jumlah, i) => jumlah + i.harga * i.qty, 0);

  const { data: tagihanBaru, error } = await supabase
    .from("tagihan")
    .insert({
      kunjungan_id: kunjunganId,
      shift_id: shiftId || null,
      jenis_penjamin_saat_bayar: jenisPenjamin,
      total_tagihan: total,
      status_pembayaran: "lunas",
      dibuat_oleh: pemanggil.id,
    })
    .select("id")
    .single();

  if (error || !tagihanBaru) {
    return { pesan: `Gagal membuat tagihan: ${error?.message}` };
  }

  const { error: errorItem } = await supabase.from("tagihan_item").insert(
    daftarItem.map((i) => ({
      tagihan_id: tagihanBaru.id,
      nama_layanan: i.nama,
      harga: i.harga,
      qty: i.qty,
      subtotal: i.harga * i.qty,
    }))
  );

  if (errorItem) {
    return { pesan: `Tagihan tersimpan tapi rincian item gagal: ${errorItem.message}` };
  }

  revalidatePath("/dashboard/kasir");
  redirect("/dashboard/kasir?dibayar=1");
}

export async function tandaiKlaimBpjsAction(formData: FormData) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KASIR.includes(pemanggil.peran)) return;

  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const shiftId = String(formData.get("shift_id") ?? "");

  const supabase = createClient();
  await supabase.from("tagihan").insert({
    kunjungan_id: kunjunganId,
    shift_id: shiftId || null,
    jenis_penjamin_saat_bayar: "bpjs",
    total_tagihan: 0,
    status_pembayaran: "klaim_bpjs",
    dibuat_oleh: pemanggil.id,
  });

  revalidatePath("/dashboard/kasir");
  redirect("/dashboard/kasir?dibayar=1");
}
