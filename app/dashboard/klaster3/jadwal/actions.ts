"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

const PERAN_KLINIS_K3 = ["admin", "dokter", "dokter_gigi", "perawat", "bidan", "tenaga_gizi"];

type Hasil = { pesan: string; sukses: boolean };

function teksAtauNull(formData: FormData, nama: string): string | null {
  const nilai = String(formData.get(nama) ?? "").trim();
  return nilai || null;
}

export async function tambahJadwalPosbinduLansiaAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return { pesan: "Kamu harus login dulu.", sukses: false };
  if (!PERAN_KLINIS_K3.includes(pemanggil.peran)) {
    return { pesan: "Cuma tenaga klinis yang boleh menjadwalkan kegiatan.", sukses: false };
  }

  const posyanduId = String(formData.get("posyandu_id") ?? "").trim();
  const tanggal = String(formData.get("tanggal_pelaksanaan") ?? "").trim();
  if (!posyanduId) return { pesan: "Pilih lokasi/posyandu dulu.", sukses: false };
  if (!tanggal) return { pesan: "Tanggal pelaksanaan wajib diisi.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("jadwal_posbindu_lansia").insert({
    posyandu_id: posyanduId,
    jenis_kegiatan: String(formData.get("jenis_kegiatan") ?? "posbindu_ptm"),
    tanggal_pelaksanaan: tanggal,
    jam_mulai: teksAtauNull(formData, "jam_mulai"),
    penanggung_jawab_id: teksAtauNull(formData, "penanggung_jawab_id"),
    catatan: teksAtauNull(formData, "catatan"),
    dibuat_oleh: pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan jadwal: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/klaster3/jadwal");
  return { pesan: "Jadwal tersimpan.", sukses: true };
}

export async function ubahStatusJadwalAction(id: string, status: "selesai" | "dibatalkan"): Promise<void> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KLINIS_K3.includes(pemanggil.peran)) return;

  const supabase = createClient();
  await supabase.from("jadwal_posbindu_lansia").update({ status }).eq("id", id);

  revalidatePath("/dashboard/klaster3/jadwal");
}
