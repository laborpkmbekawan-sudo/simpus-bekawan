"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { normalisasiNoRm } from "@/lib/lokasi";

const PERAN_KLINIS = ["admin", "dokter", "dokter_gigi", "perawat", "bidan"];

type Hasil = { pesan: string; sukses: boolean };

export async function buatRujukanAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KLINIS.includes(pemanggil.peran)) {
    return { pesan: "Cuma tenaga klinis yang boleh membuat rujukan.", sukses: false };
  }

  const noRm = normalisasiNoRm(String(formData.get("no_rm") ?? ""));
  const jenis = String(formData.get("jenis") ?? "internal");
  const keLokasiId = String(formData.get("ke_lokasi_id") ?? "");
  const tujuanEksternal = String(formData.get("tujuan_eksternal") ?? "").trim();
  const poliTujuan = String(formData.get("poli_tujuan") ?? "").trim();
  const diagnosis = String(formData.get("diagnosis") ?? "").trim();
  const alasan = String(formData.get("alasan") ?? "").trim();

  // Lokasi asal: pegawai biasa = lokasi kerjanya sendiri (gak dipercaya dari
  // form). Admin boleh pilih bebas.
  const admin = pemanggil.peran === "admin";
  const dariLokasiId = admin ? String(formData.get("dari_lokasi_id") ?? "") : pemanggil.lokasi_id ?? "";

  if (!noRm) return { pesan: "Isi No. RM pasien.", sukses: false };
  if (!dariLokasiId) {
    return { pesan: "Akunmu belum punya lokasi kerja. Minta admin mengisinya di Data Pegawai.", sukses: false };
  }
  if (jenis !== "internal" && jenis !== "eksternal") return { pesan: "Jenis rujukan gak valid.", sukses: false };
  if (!alasan) return { pesan: "Isi alasan rujukan.", sukses: false };
  if (jenis === "internal" && !keLokasiId) return { pesan: "Pilih lokasi tujuan rujukan.", sukses: false };
  if (jenis === "internal" && keLokasiId === dariLokasiId) {
    return { pesan: "Lokasi asal dan tujuan gak boleh sama.", sukses: false };
  }
  if (jenis === "eksternal" && !tujuanEksternal) {
    return { pesan: "Isi nama rumah sakit / fasilitas tujuan.", sukses: false };
  }

  const supabase = createClient();
  const { data: pasien } = await supabase
    .from("pasien")
    .select("id, nama_lengkap, no_rm")
    .eq("no_rm", noRm)
    .maybeSingle();
  if (!pasien) return { pesan: `Pasien dengan No. RM ${noRm} gak ditemukan.`, sukses: false };

  const hariIni = new Date().toISOString().slice(0, 10);
  const { data: kunjunganHariIni } = await supabase
    .from("kunjungan")
    .select("id")
    .eq("pasien_id", pasien.id)
    .eq("tanggal", hariIni)
    .order("dibuat_pada", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("rujukan").insert({
    pasien_id: pasien.id,
    kunjungan_id: kunjunganHariIni?.id ?? null,
    jenis,
    dari_lokasi_id: dariLokasiId,
    ke_lokasi_id: jenis === "internal" ? keLokasiId : null,
    tujuan_eksternal: jenis === "eksternal" ? tujuanEksternal : null,
    poli_tujuan: poliTujuan || null,
    diagnosis: diagnosis || null,
    alasan,
    dibuat_oleh: pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan rujukan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/rujukan");
  return { pesan: `Rujukan tersimpan untuk ${pasien.nama_lengkap} (RM ${pasien.no_rm}). Surat bisa dicetak dari daftar di bawah.`, sukses: true };
}

export async function ubahStatusRujukanAction(
  id: string,
  statusBaru: "diterima" | "selesai" | "dibatalkan",
  catatan?: string
) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return;

  const supabase = createClient();
  const { data: rujukan } = await supabase
    .from("rujukan")
    .select("id, jenis, status, ke_lokasi_id, dibuat_oleh")
    .eq("id", id)
    .maybeSingle();
  if (!rujukan) return;

  const admin = pemanggil.peran === "admin";
  const penerima = admin || (rujukan.jenis === "internal" && !!rujukan.ke_lokasi_id && rujukan.ke_lokasi_id === pemanggil.lokasi_id);
  const pembuat = admin || rujukan.dibuat_oleh === pemanggil.id;

  let boleh = false;
  if (statusBaru === "diterima") {
    boleh = rujukan.jenis === "internal" && rujukan.status === "dibuat" && penerima;
  } else if (statusBaru === "selesai") {
    boleh =
      rujukan.jenis === "internal"
        ? rujukan.status === "diterima" && penerima
        : rujukan.status === "dibuat" && pembuat;
  } else if (statusBaru === "dibatalkan") {
    boleh = (rujukan.status === "dibuat" || rujukan.status === "diterima") && pembuat;
  }
  if (!boleh) return;

  const perubahan: Record<string, unknown> = { status: statusBaru };
  if (catatan && catatan.trim()) perubahan.catatan_tindak_lanjut = catatan.trim();

  await supabase.from("rujukan").update(perubahan).eq("id", id);
  revalidatePath("/dashboard/rujukan");
}
