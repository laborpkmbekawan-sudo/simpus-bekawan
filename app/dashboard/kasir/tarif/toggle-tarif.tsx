"use client";

import { useTransition } from "react";
import { ubahStatusTarifAction } from "./actions";

export default function ToggleTarif({ tarifId, aktif }: { tarifId: string; aktif: boolean }) {
  const [pending, mulaiTransisi] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => mulaiTransisi(() => ubahStatusTarifAction(tarifId, !aktif))}
      className={`rounded-sm px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
        aktif ? "bg-teal-700/10 text-teal-700 hover:bg-clay-600/10 hover:text-clay-700" : "bg-ink/5 text-ink/50"
      }`}
    >
      {aktif ? "Aktif · nonaktifkan" : "Nonaktif · aktifkan"}
    </button>
  );
}
