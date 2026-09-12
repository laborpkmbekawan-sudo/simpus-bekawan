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
      className="text-sm text-ink/50 underline decoration-ink/20 underline-offset-2 hover:text-clay-700"
    >
      Keluar
    </button>
  );
}
