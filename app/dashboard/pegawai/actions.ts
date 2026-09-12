"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PERAN_VALID = [
  "admin",
  "kapus",
  "bendahara_bok",
  "dokter",
  "perawat",
  "bidan",
  "farmasi",
  "laboratorium",
  "loket_rm_kasir",
] as const;

export async function tambahPegawaiAction(
  _sebelum: { pesan: string; sukses: boolean } | null,
  formData: FormData
): Promise<{ pesan: string; sukses: boolean }> {
  // Penjagaan di server, bukan cuma sembunyikan tombol di UI -- walau RLS
  // sudah menahan insert non-admin, cek ini kasih pesan yang jelas lebih awal.
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || pemanggil.peran !== "admin") {
    return { pesan: "Hanya admin yang boleh menambah pegawai.", sukses: false };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const namaLengkap = String(formData.get("nama_lengkap") ?? "").trim();
  const jabatan = String(formData.get("jabatan") ?? "").trim();
  const unitKerja = String(formData.get("unit_kerja") ?? "").trim();
  const peran = String(formData.get("peran") ?? "");
  const kataSandiSementara = String(formData.get("kata_sandi_sementara") ?? "");
  const aksesKlasterMentah = String(formData.get("akses_klaster") ?? "[]");

  if (!email || !namaLengkap || !peran) {
    return { pesan: "Email, nama lengkap, dan hak akses wajib diisi.", sukses: false };
  }
  if (!(PERAN_VALID as readonly string[]).includes(peran)) {
    return { pesan: "Hak akses tidak valid.", sukses: false };
  }
  if (kataSandiSementara.length < 8) {
    return { pesan: "Kata sandi sementara minimal 8 karakter.", sukses: false };
  }

  let daftarAksesKlaster: { klaster_id: string; level_akses: "layanan" | "penuh" }[] = [];
  try {
    daftarAksesKlaster = JSON.parse(aksesKlasterMentah);
  } catch {
    return { pesan: "Data akses klaster tidak valid.", sukses: false };
  }

  const admin = createAdminClient();

  // 1) Buat akun login di Supabase Auth. Email dianggap sudah terverifikasi
  //    karena dibuat manual oleh admin, bukan lewat signup publik.
  const { data: userBaru, error: errorAuth } = await admin.auth.admin.createUser({
    email,
    password: kataSandiSementara,
    email_confirm: true,
  });

  if (errorAuth || !userBaru.user) {
    return {
      pesan: errorAuth?.message ?? "Gagal membuat akun login.",
      sukses: false,
    };
  }

  // 2) Buat baris data pegawai + hak akses, id disamakan dengan id auth user.
  const supabase = createClient();
  const { error: errorPegawai } = await supabase.from("pegawai").insert({
    id: userBaru.user.id,
    nama_lengkap: namaLengkap,
    jabatan: jabatan || null,
    unit_kerja: unitKerja || null,
    peran,
  });

  if (errorPegawai) {
    // Rollback: akun auth sudah terlanjur dibuat, batalkan supaya tidak
    // ada akun login "hantu" tanpa data pegawai.
    await admin.auth.admin.deleteUser(userBaru.user.id);
    return { pesan: `Gagal menyimpan data pegawai: ${errorPegawai.message}`, sukses: false };
  }

  // 3) Simpan akses klaster (boleh lebih dari satu baris, tiap baris
  //    klaster + level akses beda-beda).
  if (daftarAksesKlaster.length > 0) {
    const barisAkses = daftarAksesKlaster
      .filter((a) => a.klaster_id)
      .map((a) => ({
        pegawai_id: userBaru.user.id,
        klaster_id: a.klaster_id,
        level_akses: a.level_akses === "penuh" ? "penuh" : "layanan",
      }));

    if (barisAkses.length > 0) {
      const { error: errorAkses } = await supabase.from("akses_klaster").insert(barisAkses);
      if (errorAkses) {
        // Pegawai dan akun login tetap dibuat, tapi kasih tau akses klaster
        // gagal disimpan supaya admin bisa tambah manual lewat halaman edit.
        revalidatePath("/dashboard/pegawai");
        return {
          pesan: `Akun ${namaLengkap} dibuat, tapi akses klaster gagal disimpan: ${errorAkses.message}`,
          sukses: false,
        };
      }
    }
  }

  revalidatePath("/dashboard/pegawai");
  return { pesan: `Akun untuk ${namaLengkap} berhasil dibuat.`, sukses: true };
}

export async function ubahStatusAktifAction(pegawaiId: string, statusBaru: boolean) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || pemanggil.peran !== "admin") {
    throw new Error("Hanya admin yang boleh mengubah status pegawai.");
  }

  const supabase = createClient();
  await supabase
    .from("pegawai")
    .update({ status_aktif: statusBaru })
    .eq("id", pegawaiId);

  revalidatePath("/dashboard/pegawai");
}
