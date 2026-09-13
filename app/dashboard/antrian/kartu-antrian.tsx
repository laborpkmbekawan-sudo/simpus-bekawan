"use client";

import { useTransition } from "react";
import { ubahStatusKunjunganAction } from "./actions";

const LABEL_TRIASE: Record<string, string> = { hijau: "Hijau", kuning: "Kuning", merah: "Merah" };
const WARNA_TRIASE: Record<string, string> = {
  hijau: "bg-teal-700/10 text-teal-700",
  kuning: "bg-clay-600/10 text-clay-700",
  merah: "bg-red-500/10 text-red-600",
};

type KartuProps = {
  id: string;
  nomorAntrian: number;
  namaPasien: string;
  noRm: string;
  jenisKunjungan: string;
  status: string;
  triase: string | null;
};

export default function KartuAntrian({
  id,
  nomorAntrian,
  namaPasien,
  noRm,
  jenisKunjungan,
  status,
  triase,
}: KartuProps) {
  const [pending, mulaiTransisi] = useTransition();

  function lanjutkanStatus() {
    const berikutnya = status === "menunggu" ? "dipanggil" : "selesai";
    mulaiTransisi(() => {
      ubahStatusKunjunganAction(id, berikutnya);
    });
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-sm border px-4 py-3 ${
        status === "selesai"
          ? "border-sand-100 bg-sand-50 opacity-60"
          : status === "dipanggil"
          ? "border-teal-700/30 bg-teal-500/10"
          : "border-sand-100 bg-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-ink/5 text-sm font-bold text-ink">
          {nomorAntrian}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{namaPasien}</p>
          <p className="text-xs text-ink/50">
            No. RM {noRm} · {jenisKunjungan}
            {triase && (
              <span className={`ml-2 rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${WARNA_TRIASE[triase]}`}>
                {LABEL_TRIASE[triase]}
              </span>
            )}
          </p>
        </div>
      </div>

      {status === "selesai" ? (
        <span className="text-xs font-medium text-ink/40">Selesai</span>
      ) : (
        <button
          onClick={lanjutkanStatus}
          disabled={pending}
          className="whitespace-nowrap rounded-sm bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white
                     hover:bg-teal-900 disabled:opacity-50"
        >
          {status === "menunggu" ? "Panggil" : "Selesaikan"}
        </button>
      )}
    </div>
  );
}
