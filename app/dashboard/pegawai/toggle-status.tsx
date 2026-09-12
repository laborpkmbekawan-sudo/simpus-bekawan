"use client";

import { useTransition } from "react";
import { ubahStatusAktifAction } from "./actions";

export default function ToggleStatus({
  pegawaiId,
  statusAktif,
}: {
  pegawaiId: string;
  statusAktif: boolean;
}) {
  const [pending, mulaiTransisi] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        mulaiTransisi(() => {
          ubahStatusAktifAction(pegawaiId, !statusAktif);
        })
      }
      className={`rounded-sm px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
        statusAktif
          ? "bg-teal-700/8 text-teal-700 hover:bg-clay-600/10 hover:text-clay-700"
          : "bg-ink/5 text-ink/50 hover:bg-teal-700/8 hover:text-teal-700"
      }`}
    >
      {statusAktif ? "Aktif · nonaktifkan" : "Nonaktif · aktifkan"}
    </button>
  );
}
