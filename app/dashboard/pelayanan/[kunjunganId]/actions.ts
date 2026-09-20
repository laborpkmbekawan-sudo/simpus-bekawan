"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

const PERAN_KLINIS = ["admin", "dokter", "dokter_gigi", "perawat", "bidan"];

type Hasil = { pesan: string; sukses: boolean };

// Satu pintu cek akses buat SEMUA aksi pelayanan:
// 1. peran klinis, 2. kunjungan ada dan belum selesai,
// 3. admin, atau pegawai yang punya akses ke klaster tujuan kunjungan.
async function cekAkses(kunjunganId: string) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KLINIS.includes(pemanggil.peran)) {
    return { ok: false as const, pesan: "Cuma tenaga klinis yang boleh melayani pasien." };
  }

  const supabase = createClient();
  const { data: kunjungan } = await supabase
    .from("kunjungan")
    .select("id, status, klaster_tujuan_id")
    .eq("id", kunjunganId)
    .single();

  if (!kunjungan) return { ok: false as const, pesan: "Kunjungan gak ditemukan." };
  if (kunjungan.status === "selesai") {
    return { ok: false as const, pesan: "Kunjungan ini sudah selesai, gak bisa diubah lagi." };
  }

  if (pemanggil.peran !== "admin") {
    const { data: akses } = await supabase
      .from("akses_klaster")
      .select("id")
      .eq("pegawai_id", pemanggil.id)
      .eq("klaster_id", kunjungan.klaster_tujuan_id)
      .maybeSingle();
    if (!akses) return { ok: false as const, pesan: "Kamu gak punya akses ke klaster kunjungan ini." };
  }

  return { ok: true as const, pemanggil, supabase };
}

export async function simpanCatatanKlinisAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  // SOAP: S = subjektif, O = objektif, A = diagnosis, P = tindakan (terapi / rencana).
  const subjektif = String(formData.get("subjektif") ?? "").trim();
  const objektif = String(formData.get("objektif") ?? "").trim();
  const diagnosis = String(formData.get("diagnosis") ?? "").trim();
  const tindakan = String(formData.get("tindakan") ?? "").trim();

  const { error } = await akses.supabase.from("catatan_klinis").upsert(
    {
      kunjungan_id: kunjunganId,
      subjektif: subjektif || null,
      objektif: objektif || null,
      diagnosis: diagnosis || null,
      tindakan: tindakan || null,
      dibuat_oleh: akses.pemanggil.id,
    },
    { onConflict: "kunjungan_id" }
  );

  if (error) return { pesan: `Gagal menyimpan catatan klinis: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: "Catatan klinis tersimpan.", sukses: true };
}

export async function catatTindakanAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const tarifLayananId = String(formData.get("tarif_layanan_id") ?? "");
  if (!tarifLayananId) return { pesan: "Pilih tindakan dulu.", sukses: false };

  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  let daftarBhp: { bhp_id: string; jumlah: number }[] = [];
  try {
    const mentah = JSON.parse(String(formData.get("daftar_bhp") ?? "[]"));
    daftarBhp = (Array.isArray(mentah) ? mentah : [])
      .map((b) => ({ bhp_id: String(b.bhp_id), jumlah: Number(b.jumlah) }))
      .filter((b) => Number.isFinite(b.jumlah) && b.jumlah >= 0);
  } catch {
    return { pesan: "Data BHP gak valid.", sukses: false };
  }

  const { error } = await akses.supabase.rpc("catat_tindakan_kunjungan", {
    p_kunjungan_id: kunjunganId,
    p_tarif_layanan_id: tarifLayananId,
    p_daftar_bhp: daftarBhp,
  });

  if (error) return { pesan: `Gagal mencatat tindakan: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: "Tindakan tercatat, stok BHP kepotong otomatis.", sukses: true };
}

export async function batalkanTindakanAction(tindakanId: string, kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  // Pastikan tindakan ini memang milik kunjungan yang lagi dilayani.
  const { data: tindakan } = await akses.supabase
    .from("kunjungan_tindakan")
    .select("id")
    .eq("id", tindakanId)
    .eq("kunjungan_id", kunjunganId)
    .maybeSingle();
  if (!tindakan) return;

  await akses.supabase.rpc("batalkan_tindakan_kunjungan", { p_tindakan_id: tindakanId });
  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
}

export async function selesaikanPelayananAction(kunjunganId: string) {
  const akses = await cekAkses(kunjunganId);
  if (!akses.ok) return;

  await akses.supabase.from("kunjungan").update({ status: "selesai" }).eq("id", kunjunganId);
  revalidatePath("/dashboard/antrian");
  redirect("/dashboard/antrian");
}
