"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function TombolKeluar() {
  const router = useRouter();
  const supabase = createClient();

  async function keluar() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={keluar}
      className="text-sm text-white/60 underline decoration-white/25 underline-offset-2 hover:text-white"
    >
      Keluar
    </button>
  );
}
