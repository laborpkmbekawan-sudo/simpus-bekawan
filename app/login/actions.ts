"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const email = String(formData.get("email") ?? "").trim();
  const kataSandi = String(formData.get("kata_sandi") ?? "");

  if (!email || !kataSandi) {
    return { pesan: "Email dan kata sandi wajib diisi." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: kataSandi,
  });

  if (error) {
    // Pesan digeneralisir sengaja -- tidak bocorkan apakah email terdaftar
    // atau tidak, supaya tidak jadi celah enumerasi akun pegawai.
    return { pesan: "Email atau kata sandi salah. Coba lagi." };
  }

  redirect("/dashboard");
}
