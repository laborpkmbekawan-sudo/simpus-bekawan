"use server";

import { createClient } from "@/lib/supabase/server";

const NILAI_VALID = ["sangat_puas", "puas", "cukup", "kurang_puas"];

export type HasilSurvei = { pesan: string; sukses: boolean };

// Halaman ini dibuka publik tanpa login (mis. lewat tablet di ruang tunggu
// atau QR code), jadi datanya dianggap tidak terverifikasi: nama/No. RM
// cuma pelengkap, bukan dicocokkan ke data pasien.
export async function simpanSurveiAction(_sebelum: HasilSurvei | null, formData: FormData): Promise<HasilSurvei> {
  const klasterId = String(formData.get("klaster_id") ?? "").trim();
  const namaPasien = String(formData.get("nama_pasien") ?? "").trim();
  const noRm = String(formData.get("no_rm") ?? "").trim();
  const nilai = String(formData.get("nilai") ?? "");
  const saran = String(formData.get("saran") ?? "").trim();

  if (!NILAI_VALID.includes(nilai)) return { pesan: "Pilih nilai pelayanan.", sukses: false };
  if (namaPasien.length > 200) return { pesan: "Nama terlalu panjang.", sukses: false };
  if (noRm.length > 30) return { pesan: "No. RM terlalu panjang.", sukses: false };
  if (saran.length > 2000) return { pesan: "Saran terlalu panjang, maksimal 2000 karakter.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("survei_kepuasan").insert({
    klaster_id: klasterId || null,
    nama_pasien: namaPasien || null,
    no_rm: noRm || null,
    nilai,
    saran: saran || null,
  });

  if (error) return { pesan: "Gagal menyimpan survei. Coba lagi.", sukses: false };
  return { pesan: "Terima kasih, survei kamu sudah tersimpan.", sukses: true };
}
