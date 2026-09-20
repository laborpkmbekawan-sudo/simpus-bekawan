"use client";

import { useState } from "react";
import { selesaikanPelayananAction } from "./actions";

export default function TombolSelesai({ kunjunganId }: { kunjunganId: string }) {
  const [pending, setPending] = useState(false);

  async function selesai() {
    if (!window.confirm("Selesaikan pelayanan? Kunjungan ini gak bisa diubah lagi setelahnya.")) return;
    setPending(true);
    await selesaikanPelayananAction(kunjunganId);
    setPending(false);
  }

  return (
    <button
      onClick={selesai}
      disabled={pending}
      className="rounded-sm bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-50"
    >
      {pending ? "Memproses..." : "Selesaikan Pelayanan"}
    </button>
  );
}
