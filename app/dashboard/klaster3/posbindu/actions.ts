"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

const PERAN_KLINIS_K3 = ["admin", "dokter", "dokter_gigi", "perawat", "bidan", "tenaga_gizi"];

type Hasil = { pesan: string; sukses: boolean };

function teksAtauNull(formData: FormData, nama: string): string | null {
  const nilai = String(formData.get(nama) ?? "").trim();
  return nilai || null;
}

function angkaAtauNull(formData: FormData, nama: string): number | null {
  const nilai = String(formData.get(nama) ?? "").trim();
  if (!nilai) return null;
  const n = Number(nilai);
  return Number.isFinite(n) ? n : null;
}

// Cari pasien lintas no_rm/nama/nik -- dipakai pemilih pasien di form
// Posbindu & Prolanis. Sengaja terpisah dari cariPasienAction milik modul
// Rujukan biar daftar peran yang boleh cari juga ikut tenaga_gizi.
export async function cariPasienKlaster3Action(
  kata: string
): Promise<{ noRm: string; pasienId: string; nama: string; nik: string | null }[]> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KLINIS_K3.includes(pemanggil.peran)) return [];

  const bersih = kata.replace(/[^\p{L}\p{N}\s.'-]/gu, "").trim();
  if (bersih.length < 2) return [];

  const supabase = createClient();
  const { data } = await supabase
    .from("pasien")
    .select("id, no_rm, nama_lengkap, nik")
    .or(`nama_lengkap.ilike.%${bersih}%,no_rm.ilike.%${bersih}%,nik.ilike.%${bersih}%`)
    .order("nama_lengkap", { ascending: true })
    .limit(10);

  return (data ?? []).map((p) => ({ pasienId: p.id, noRm: p.no_rm, nama: p.nama_lengkap, nik: p.nik ?? null }));
}

export async function tambahKegiatanPosbinduAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return { pesan: "Kamu harus login dulu.", sukses: false };
  if (!PERAN_KLINIS_K3.includes(pemanggil.peran)) {
    return { pesan: "Cuma tenaga klinis yang boleh mencatat kegiatan Posbindu.", sukses: false };
  }

  const pasienId = String(formData.get("pasien_id") ?? "").trim();
  if (!pasienId) return { pesan: "Pilih pasien dulu.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("kegiatan_posbindu_ptm").insert({
    pasien_id: pasienId,
    posyandu_id: teksAtauNull(formData, "posyandu_id"),
    tanggal: teksAtauNull(formData, "tanggal") ?? new Date().toISOString().slice(0, 10),
    berat_badan: angkaAtauNull(formData, "berat_badan"),
    tinggi_badan: angkaAtauNull(formData, "tinggi_badan"),
    lingkar_perut: angkaAtauNull(formData, "lingkar_perut"),
    td_sistolik: angkaAtauNull(formData, "td_sistolik"),
    td_diastolik: angkaAtauNull(formData, "td_diastolik"),
    gula_darah_sewaktu: angkaAtauNull(formData, "gula_darah_sewaktu"),
    kolesterol_total: angkaAtauNull(formData, "kolesterol_total"),
    asam_urat: angkaAtauNull(formData, "asam_urat"),
    faktor_risiko: teksAtauNull(formData, "faktor_risiko"),
    hasil_skrining: String(formData.get("hasil_skrining") ?? "normal"),
    tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
    dicatat_oleh: pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/klaster3/posbindu");
  revalidatePath("/dashboard/klaster3");
  return { pesan: "Kegiatan Posbindu tersimpan.", sukses: true };
}

// Tombol batal dipanggil langsung (bukan lewat <form>), jadi cukup terima
// id -- pola sama seperti ubahStatusAktifAction di modul Pegawai.
export async function batalkanKegiatanPosbinduAction(id: string): Promise<void> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KLINIS_K3.includes(pemanggil.peran)) return;

  const supabase = createClient();
  await supabase.from("kegiatan_posbindu_ptm").update({ dibatalkan: true }).eq("id", id);

  revalidatePath("/dashboard/klaster3/posbindu");
  revalidatePath("/dashboard/klaster3");
}

export async function tambahKontrolProlanisAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return { pesan: "Kamu harus login dulu.", sukses: false };
  if (!PERAN_KLINIS_K3.includes(pemanggil.peran)) {
    return { pesan: "Cuma tenaga klinis yang boleh mencatat Kontrol Prolanis.", sukses: false };
  }

  const pasienId = String(formData.get("pasien_id") ?? "").trim();
  const jenisPenyakit = String(formData.get("jenis_penyakit") ?? "");
  if (!pasienId) return { pesan: "Pilih pasien dulu.", sukses: false };
  if (!jenisPenyakit) return { pesan: "Jenis penyakit wajib dipilih.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("kontrol_prolanis").insert({
    pasien_id: pasienId,
    tanggal_kontrol: teksAtauNull(formData, "tanggal_kontrol") ?? new Date().toISOString().slice(0, 10),
    jenis_penyakit: jenisPenyakit,
    td_sistolik: angkaAtauNull(formData, "td_sistolik"),
    td_diastolik: angkaAtauNull(formData, "td_diastolik"),
    gula_darah_puasa: angkaAtauNull(formData, "gula_darah_puasa"),
    gula_darah_sewaktu: angkaAtauNull(formData, "gula_darah_sewaktu"),
    berat_badan: angkaAtauNull(formData, "berat_badan"),
    kepatuhan_obat: String(formData.get("kepatuhan_obat") ?? "patuh"),
    obat_diberikan: teksAtauNull(formData, "obat_diberikan"),
    keluhan: teksAtauNull(formData, "keluhan"),
    tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
    dicatat_oleh: pemanggil.id,
  });

  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/klaster3/posbindu");
  revalidatePath("/dashboard/klaster3");
  return { pesan: "Kontrol Prolanis tersimpan.", sukses: true };
}

export async function batalkanKontrolProlanisAction(id: string): Promise<void> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_KLINIS_K3.includes(pemanggil.peran)) return;

  const supabase = createClient();
  await supabase.from("kontrol_prolanis").update({ dibatalkan: true }).eq("id", id);

  revalidatePath("/dashboard/klaster3/posbindu");
  revalidatePath("/dashboard/klaster3");
}
