"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function ubahStatusKunjunganAction(kunjunganId: string, statusBaru: string) {
  const supabase = createClient();
  await supabase.from("kunjungan").update({ status: statusBaru }).eq("id", kunjunganId);
  revalidatePath("/dashboard/antrian");
}
