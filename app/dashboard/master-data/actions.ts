"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

type Hasil = { pesan: string; sukses: boolean };

async function cekAdmin() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || pemanggil.peran !== "admin") {
    return { ok: false as const, pesan: "Khusus admin." };
  }
  return { ok: true as const, supabase: createClient() };
}

export async function simpanKlasterAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const akses = await cekAdmin();
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const id = String(formData.get("id") ?? "").trim();
  const kode = String(formData.get("kode") ?? "").trim();
  const nama = String(formData.get("nama") ?? "").trim();
  const kelompok = String(formData.get("kelompok") ?? "klaster").trim();
  const kodeAntrian = String(formData.get("kode_antrian") ?? "").trim();
  const urutan = Number(formData.get("urutan") ?? 0);

  if (!kode || !nama) return { pesan: "Kode dan nama klaster wajib diisi.", sukses: false };

  const baris = {
    kode,
    nama,
    kelompok,
    kode_antrian: kodeAntrian || null,
    urutan: Number.isFinite(urutan) ? urutan : 0,
  };

  const { error } = id
    ? await akses.supabase.from("klaster").update(baris).eq("id", id)
    : await akses.supabase.from("klaster").insert(baris);

  if (error) return { pesan: `Gagal menyimpan klaster: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/master-data");
  return { pesan: "Klaster tersimpan.", sukses: true };
}

export async function simpanLokasiAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const akses = await cekAdmin();
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const id = String(formData.get("id") ?? "").trim();
  const kode = String(formData.get("kode") ?? "").trim();
  const nama = String(formData.get("nama") ?? "").trim();
  const tipe = String(formData.get("tipe") ?? "pustu").trim();
  const urutan = Number(formData.get("urutan") ?? 0);

  if (!kode || !nama) return { pesan: "Kode dan nama lokasi wajib diisi.", sukses: false };
  if (!["induk", "pustu"].includes(tipe)) return { pesan: "Tipe lokasi tidak valid.", sukses: false };

  const baris = { kode, nama, tipe, urutan: Number.isFinite(urutan) ? urutan : 0 };

  const { error } = id
    ? await akses.supabase.from("lokasi").update(baris).eq("id", id)
    : await akses.supabase.from("lokasi").insert(baris);

  if (error) return { pesan: `Gagal menyimpan lokasi: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/master-data");
  return { pesan: "Lokasi tersimpan.", sukses: true };
}

export async function simpanPosyanduAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const akses = await cekAdmin();
  if (!akses.ok) return { pesan: akses.pesan, sukses: false };

  const id = String(formData.get("id") ?? "").trim();
  const lokasiId = String(formData.get("lokasi_id") ?? "").trim();
  const nama = String(formData.get("nama") ?? "").trim();

  if (!lokasiId || !nama) return { pesan: "Lokasi induk dan nama posyandu wajib diisi.", sukses: false };

  const baris = { lokasi_id: lokasiId, nama };

  const { error } = id
    ? await akses.supabase.from("posyandu").update(baris).eq("id", id)
    : await akses.supabase.from("posyandu").insert(baris);

  if (error) return { pesan: `Gagal menyimpan posyandu: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/master-data");
  return { pesan: "Posyandu tersimpan.", sukses: true };
}
