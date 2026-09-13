"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

export async function ubahStatusKunjunganAction(kunjunganId: string, statusBaru: string) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return;

  const supabase = createClient();

  if (pemanggil.peran !== "admin") {
    const { data: kunjungan } = await supabase
      .from("kunjungan")
      .select("klaster_tujuan_id")
      .eq("id", kunjunganId)
      .single();

    if (!kunjungan) return;

    const { data: akses } = await supabase
      .from("akses_klaster")
      .select("id")
      .eq("pegawai_id", pemanggil.id)
      .eq("klaster_id", kunjungan.klaster_tujuan_id)
      .maybeSingle();

    if (!akses) {
      // Bukan admin dan gak punya akses ke klaster ini -- tolak diam-diam,
      // konsisten sama tombol yang memang gak dimunculkan di UI.
      return;
    }
  }

  await supabase.from("kunjungan").update({ status: statusBaru }).eq("id", kunjunganId);
  revalidatePath("/dashboard/antrian");
}
