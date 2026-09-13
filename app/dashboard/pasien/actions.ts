"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

export async function tambahPasienAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) {
    return { pesan: "Sesi login gak ditemukan, coba masuk ulang." };
  }

  const nik = String(formData.get("nik") ?? "").trim();
  const namaLengkap = String(formData.get("nama_lengkap") ?? "").trim();
  const tanggalLahir = String(formData.get("tanggal_lahir") ?? "").trim();
  const jenisKelamin = String(formData.get("jenis_kelamin") ?? "").trim();
  const jenisPenjamin = String(formData.get("jenis_penjamin") ?? "umum").trim();
  const noBpjs = String(formData.get("no_bpjs") ?? "").trim();
  const alamatJalan = String(formData.get("alamat_jalan") ?? "").trim();
  const alamatDesa = String(formData.get("alamat_desa") ?? "").trim();
  const alamatRt = String(formData.get("alamat_rt") ?? "").trim();
  const alamatRw = String(formData.get("alamat_rw") ?? "").trim();
  const alamatKecamatan = String(formData.get("alamat_kecamatan") ?? "").trim();
  const alamatKabupaten = String(formData.get("alamat_kabupaten") ?? "").trim();
  const noHp = String(formData.get("no_hp") ?? "").trim();
  const alergi = String(formData.get("alergi") ?? "").trim();

  if (!namaLengkap) {
    return { pesan: "Nama lengkap wajib diisi." };
  }
  if (nik && nik.length !== 16) {
    return { pesan: "NIK harus 16 digit. Kosongkan kalau belum ada." };
  }
  if (jenisPenjamin === "bpjs" && !noBpjs) {
    return { pesan: "No. BPJS wajib diisi kalau penjamin BPJS." };
  }

  const supabase = createClient();
  const { data: pasienBaru, error } = await supabase
    .from("pasien")
    .insert({
      nik: nik || null,
      nama_lengkap: namaLengkap,
      tanggal_lahir: tanggalLahir || null,
      jenis_kelamin: jenisKelamin || null,
      jenis_penjamin: jenisPenjamin === "bpjs" ? "bpjs" : "umum",
      no_bpjs: jenisPenjamin === "bpjs" ? noBpjs : null,
      alamat_jalan: alamatJalan || null,
      alamat_desa: alamatDesa || null,
      alamat_rt: alamatRt || null,
      alamat_rw: alamatRw || null,
      alamat_kecamatan: alamatKecamatan || null,
      alamat_kabupaten: alamatKabupaten || null,
      no_hp: noHp || null,
      alergi: alergi || null,
      dibuat_oleh: pemanggil.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { pesan: "NIK ini sudah terdaftar sebelumnya. Cek di pencarian." };
    }
    return { pesan: `Gagal menyimpan data pasien: ${error.message}` };
  }

  revalidatePath("/dashboard/pasien");
  redirect(`/dashboard/pasien?baru=${pasienBaru.id}`);
}
